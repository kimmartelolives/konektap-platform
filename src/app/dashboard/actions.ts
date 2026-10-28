"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Unauthorized" };

  // Format the custom URL slug (lowercase, no spaces)
  let username = formData.get("username") as string;
  if (username) {
    username = username.toLowerCase().replace(/[^a-z0-9-_]/g, "");
  }

  const updates = {
    username: username || null,
    full_name: formData.get("full_name") as string,
    profession: formData.get("profession") as string,
    bio: formData.get("bio") as string,
    email_public: formData.get("email_public") as string,
    phone_public: formData.get("phone_public") as string,
    is_published: formData.get("is_published") === "on",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    // Handle Postgres unique violation (duplicate username)
    if (error.code === '23505') {
      return { error: "That custom link slug is already taken. Please choose another." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  return { success: true };
}