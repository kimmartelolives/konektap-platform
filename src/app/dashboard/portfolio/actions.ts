"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePortfolioItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const itemId = formData.get("id") as string | null;

  // --- TIER LIMIT ENFORCEMENT (Only for new item inserts) ---
  if (!itemId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    const userTier = (profile?.tier || "demo") as "demo" | "standard" | "premium";
    const maxItems = userTier === "premium" ? 99 : userTier === "standard" ? 6 : 0;

    const { count } = await supabase
      .from("portfolio_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) >= maxItems) {
      const nextTier = userTier === "demo" ? "Standard" : "Premium";
      return { 
        error: `Your ${userTier.toUpperCase()} plan is limited to ${maxItems} portfolio items. Upgrade to ${nextTier} for more!` 
      };
    }
  }
  // -----------------------------------------------------------

  // Get all newly uploaded pictures (array of files)
  const imageFiles = formData.getAll("images") as File[];
  
  // Get the retained/existing image URLs (parsed from JSON string in the form)
  let image_urls: string[] = [];
  const existingImagesRaw = formData.get("existing_image_urls") as string;
  if (existingImagesRaw) {
    try {
      image_urls = JSON.parse(existingImagesRaw);
    } catch (e) {
      image_urls = [];
    }
  }

  // If there are newly uploaded pictures, upload them to Supabase one by one
  const newUrls: string[] = [];
  if (imageFiles.length > 0) {
    for (const file of imageFiles) {
      if (file.size > 0) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from("portfolio").upload(fileName, file);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from("portfolio").getPublicUrl(fileName);
          newUrls.push(publicUrlData.publicUrl);
        }
      }
    }
  }

  // Merge the retained old images with the newly uploaded ones
  const finalImageUrls = [...image_urls, ...newUrls];

  const itemData = {
    user_id: user.id,
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    link_url: formData.get("link_url") as string,
    image_urls: finalImageUrls,
    position: Number(formData.get("position")) || 0,
  };

  let error;
  if (itemId) {
    const { error: updateError } = await supabase.from("portfolio_items").update(itemData).eq("id", itemId).eq("user_id", user.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from("portfolio_items").insert(itemData);
    error = insertError;
  }

  if (error) return { error: error.message };

  revalidatePath("/dashboard/portfolio");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (profile?.username) revalidatePath(`/@${profile.username}`);

  return { success: true };
}

// Manually delete a file from storage (if they removed the picture while editing)
export async function deletePortfolioImage(imageUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const fileName = imageUrl.split('/').pop();
  if (fileName) {
    await supabase.storage.from("portfolio").remove([fileName]);
  }
  return { success: true };
}

export async function deletePortfolioItem(itemId: string, imageUrls: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Delete all pictures of this item from storage
  if (imageUrls && imageUrls.length > 0) {
    const fileNames = imageUrls.map(url => url.split('/').pop()).filter(Boolean) as string[];
    if (fileNames.length > 0) {
      await supabase.storage.from("portfolio").remove(fileNames);
    }
  }

  const { error } = await supabase.from("portfolio_items").delete().eq("id", itemId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/portfolio");
  return { success: true };
}