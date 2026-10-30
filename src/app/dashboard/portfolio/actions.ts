"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePortfolioItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const id = (formData.get("id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim();
  const category = ((formData.get("category") as string) || "").trim() || null;
  const description =
    ((formData.get("description") as string) || "").trim() || null;
  const link_url = ((formData.get("link_url") as string) || "").trim() || null;
  const cta_label =
    ((formData.get("cta_label") as string) || "").trim() || "View Project";
  const position = Number(formData.get("position")) || 0;

  if (!title) return { error: "Project title is required." };

  let existingUrls: string[] = [];
  try {
    const rawExisting = formData.get("existing_image_urls") as string;
    if (rawExisting) existingUrls = JSON.parse(rawExisting);
  } catch {
    existingUrls = [];
  }

  // Handle optional file uploads (compressed on client)
  const files = formData.getAll("images") as File[];
  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/portfolio-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        return { error: `Image upload failed: ${uploadError.message}` };
      }

      const { data: publicUrlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }
  }

  const finalImageUrls = [...existingUrls, ...uploadedUrls].slice(0, 10);

  const payload = {
    user_id: user.id,
    title,
    category,
    description,
    link_url,
    cta_label,
    image_urls: finalImageUrls,
    position,
  };

  if (id) {
    const { error } = await supabase
      .from("portfolio_items")
      .update(payload)
      .match({ id, user_id: user.id });

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("portfolio_items").insert(payload);
    if (error) return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  revalidatePath("/dashboard/portfolio");
  if (profile?.username) revalidatePath(`/@${profile.username}`);

  return { success: true };
}

export async function deletePortfolioItem(id: string, imageUrls: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .match({ id, user_id: user.id });

  if (error) return { error: error.message };

  for (const url of imageUrls) {
    try {
      await deletePortfolioImage(url);
    } catch {
      /* ignore external URLs */
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  revalidatePath("/dashboard/portfolio");
  if (profile?.username) revalidatePath(`/@${profile.username}`);

  return { success: true };
}

export async function deletePortfolioImage(imageUrl: string) {
  if (!imageUrl || !imageUrl.includes("/storage/v1/object/public/portfolio/")) {
    return { success: true };
  }

  const supabase = await createClient();
  const pathPart = imageUrl.split("/storage/v1/object/public/portfolio/")[1];
  if (pathPart) {
    await supabase.storage
      .from("portfolio")
      .remove([decodeURIComponent(pathPart)]);
  }
  return { success: true };
}

export async function updatePortfolioOrder(
  items: { id: string; position: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  for (const item of items) {
    await supabase
      .from("portfolio_items")
      .update({ position: item.position })
      .match({ id: item.id, user_id: user.id });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  revalidatePath("/dashboard/portfolio");
  if (profile?.username) revalidatePath(`/@${profile.username}`);

  return { success: true };
}

export async function trackPortfolioClick(itemId: string) {
  if (!itemId) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("increment_portfolio_item_click", {
      target_item_id: itemId,
    });
  } catch {
    // Non-blocking analytics call
  }
}