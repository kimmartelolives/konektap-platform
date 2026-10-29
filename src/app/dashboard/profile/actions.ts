"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const avatarFile = formData.get("avatar") as File | null;
  let avatar_url = formData.get("existing_avatar_url") as string;

  // Kung may in-upload na bagong picture
  if (avatarFile && avatarFile.size > 0) {
    
    // 1. BURAHIN MUNA ANG LUMANG PICTURE (Kung meron man)
    if (avatar_url) {
      const oldFileName = avatar_url.split('/').pop(); // Kunin ang filename sa dulo ng URL
      if (oldFileName) {
        await supabase.storage.from("avatars").remove([oldFileName]);
      }
    }

    // 2. I-UPLOAD ANG BAGONG PICTURE
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile);

    if (uploadError) {
      return { error: "Image upload failed: " + uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    avatar_url = publicUrlData.publicUrl;
  }

  const rawUsername = formData.get("username") as string;
  const username = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");

  const updates = {
    full_name: formData.get("full_name") as string,
    username: username,
    profession: formData.get("profession") as string,
    bio: formData.get("bio") as string,
    phone_public: formData.get("phone_public") as string,
    email_public: formData.get("email_public") as string,
    is_published: formData.get("is_published") === "on",
    avatar_url: avatar_url,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: "This username is already taken. Please choose another one." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/@${username}`);
  return { success: true, username };
}