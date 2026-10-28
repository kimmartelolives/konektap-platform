"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Sanitize the username (lowercase, no spaces, only letters/numbers/underscores)
  const rawUsername = formData.get("username") as string;
  const username = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");

  const updates = {
    full_name: formData.get("full_name") as string,
    username: username,
    profession: formData.get("profession") as string,
    bio: formData.get("bio") as string,
    phone_public: formData.get("phone_public") as string,
    email_public: formData.get("email_public") as string,
    is_published: formData.get("is_published") === "on", // Checkbox
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    // Handle Supabase unique constraint error for usernames
    if (error.code === '23505') {
      return { error: "This username is already taken. Please choose another one." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/@${username}`);
  return { success: true, username };
}