"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function getAdminStats() {
  const supabase = await createClient();
  
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: premiumUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tier", "premium");

  // 1. Kumuha ng New Signups (Last 7 Days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const { count: newSignups } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneWeekAgo.toISOString());

  // 2. Kumuha ng Global Profile Views (SUM ng lahat ng views)
  const { data: viewsData } = await supabase
    .from("profiles")
    .select("views");
  
  const totalViews = viewsData?.reduce((sum, row) => sum + (row.views || 0), 0) || 0;

  // 3. Kumuha ng recent users para sa table
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, tier, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return { 
    totalUsers: totalUsers || 0, 
    premiumUsers: premiumUsers || 0,
    newSignups: newSignups || 0,
    totalViews: totalViews,
    recentUsers: recentUsers || [] 
  };
}

export async function updateUserTier(userId: string, newTier: string) {
  const admin = await verifyAdmin();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tier: newTier })
    .eq("id", userId);

  if (error) return { error: error.message };
  
  revalidatePath("/admin-soniry-hq-x8y9z2026");
  return { success: true };
}

export async function bulkUpdateTier(userIds: string[], newTier: string) {
  const admin = await verifyAdmin();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tier: newTier })
    .in("id", userIds);

  if (error) return { error: error.message };
  revalidatePath("/admin-soniry-hq-x8y9z2026/users");
  return { success: true };
}

export async function updateUserDetails(userId: string, data: { full_name?: string, username?: string, status?: string }) {
  const admin = await verifyAdmin();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin-soniry-hq-x8y9z2026/users");
  return { success: true };
}

export async function deleteUserRecord(userId: string) {
  const admin = await verifyAdmin();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  // Paalala: Binubura lang nito ang profile. Ang mismong auth record ay kailangan 
  // ng Supabase Admin Role Key para tuluyang mabura sa auth.users.
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin-soniry-hq-x8y9z2026/users");
  return { success: true };
}