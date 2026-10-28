"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addLink(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

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

export async function updateLinkOrder(links: { id: string; position: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Supabase 'upsert' updates multiple rows at once based on their ID
  const updates = links.map(link => ({
    id: link.id,
    user_id: user.id,
    position: link.position,
  }));

  const { error } = await supabase.from("social_links").upsert(updates, { onConflict: 'id' });
  
  if (error) return { error: error.message };
  revalidatePath("/dashboard/links");
  return { success: true };
}