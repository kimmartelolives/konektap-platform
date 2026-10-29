"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addLink(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 1. Fetch user tier from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier || "demo") as "demo" | "standard" | "premium";
  const maxLinks = userTier === "premium" ? 99 : userTier === "standard" ? 10 : 2;

  // 2. Check existing social links count against tier limit
  const { count } = await supabase
    .from("social_links")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) >= maxLinks) {
    const nextTier = userTier === "demo" ? "Standard or Premium" : "Premium";
    return { 
      error: `Your ${userTier.toUpperCase()} plan is limited to ${maxLinks} social links. Upgrade to ${nextTier} to add more!` 
    };
  }

  const newLink = {
    user_id: user.id,
    title: formData.get("title") as string,
    url: formData.get("url") as string,
    platform: formData.get("platform") as string,
    position: Number(formData.get("position")) || 0,
  };

  const { error } = await supabase.from("social_links").insert(newLink);
  
  if (error) return { error: error.message };
  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function deleteLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("social_links").delete().match({ id, user_id: user.id });
  
  if (error) return { error: error.message };
  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function updateLinkOrder(items: { id: string; position: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Update position in Supabase database one by one
  for (const item of items) {
    await supabase
      .from("social_links")
      .update({ position: item.position })
      .eq("id", item.id)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard/links");
  
  // Update public profile immediately to reflect the new order
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (profile?.username) {
    revalidatePath(`/@${profile.username}`);
  }

  return { success: true };
}