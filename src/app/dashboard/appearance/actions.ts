"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAppearance(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const bannerFile = formData.get("banner") as File | null;
  let banner_url = formData.get("existing_banner_url") as string || "";

  // Kapag may in-upload na bagong banner
  if (bannerFile && bannerFile.size > 0) {
    // 1. Burahin ang lumang banner
    if (banner_url) {
      const oldFileName = banner_url.split('/').pop();
      if (oldFileName) await supabase.storage.from("banners").remove([oldFileName]);
    }

    // 2. I-upload ang bago
    const fileExt = bannerFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("banners").upload(fileName, bannerFile);
    
    if (uploadError) return { error: "Banner upload failed: " + uploadError.message };

    const { data: publicUrlData } = supabase.storage.from("banners").getPublicUrl(fileName);
    banner_url = publicUrlData.publicUrl;
  }

  // Kung pinindot yung "Remove Banner" button
  if (formData.get("remove_banner") === "true") {
    if (banner_url) {
      const oldFileName = banner_url.split('/').pop();
      if (oldFileName) await supabase.storage.from("banners").remove([oldFileName]);
    }
    banner_url = "";
  }

  const updates = {
    theme: formData.get("theme") as string,
    font_style: formData.get("font_style") as string,
    button_shape: formData.get("button_shape") as string,
    color_mode: formData.get("color_mode") as string,
    banner_url: banner_url,
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/appearance");
  
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (profile?.username) revalidatePath(`/@${profile.username}`);

  return { success: true };
}