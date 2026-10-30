"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to verify Premium tier on the server
async function verifyPremiumUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, username")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "premium") {
    return { supabase, user: null, error: "Premium plan required for Business Hub features." };
  }

  return { supabase, user, username: profile?.username, error: null };
}

// Helper: Auto-format Google Drive sharing links into preview/download/image links
function formatGoogleDriveUrl(
  url: string,
  mode: "view" | "download" | "image"
): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const fileIdMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (fileIdMatch && fileIdMatch[1] && trimmed.includes("drive.google.com")) {
    const fileId = fileIdMatch[1];
    if (mode === "download") {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    if (mode === "image") {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return trimmed;
}

// 1. Add a Service Item
export async function addService(formData: FormData) {
  const { supabase, user, username, error: authError } = await verifyPremiumUser();
  if (authError || !user) return { error: authError };

  const title = formData.get("title") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;
  const position = Number(formData.get("position")) || 0;

  const { error } = await supabase.from("services").insert({
    user_id: user.id,
    title,
    price,
    description,
    position,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/business");
  if (username) revalidatePath(`/@${username}`);
  return { success: true };
}

// 2. Update an Existing Service Item
export async function updateService(formData: FormData) {
  const { supabase, user, username, error: authError } = await verifyPremiumUser();
  if (authError || !user) return { error: authError };

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;

  const { error } = await supabase
    .from("services")
    .update({
      title,
      price,
      description,
    })
    .match({ id, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/business");
  if (username) revalidatePath(`/@${username}`);
  return { success: true };
}

// 3. Delete a Service Item
export async function deleteService(id: string) {
  const { supabase, user, username, error: authError } = await verifyPremiumUser();
  if (authError || !user) return { error: authError };

  const { error } = await supabase
    .from("services")
    .delete()
    .match({ id, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/business");
  if (username) revalidatePath(`/@${username}`);
  return { success: true };
}

// 4. Update Service Order (Drag and Drop)
export async function updateServiceOrder(items: { id: string; position: number }[]) {
  const { supabase, user, username, error: authError } = await verifyPremiumUser();
  if (authError || !user) return { error: authError };

  for (const item of items) {
    await supabase
      .from("services")
      .update({ position: item.position })
      .eq("id", item.id)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard/business");
  if (username) revalidatePath(`/@${username}`);
  return { success: true };
}

// 5. Update Map, Appointments, or Catalog Settings (Direct URLs + GDrive Formatter)
export async function updateBusinessSettings(formData: FormData) {
  const { supabase, user, username, error: authError } = await verifyPremiumUser();
  if (authError || !user) return { error: authError };

  const section = formData.get("section") as string;
  const updates: Record<string, any> = {};

  if (section === "map") {
    const rawAddress = (formData.get("location_address") as string) || "";
    let rawMapUrl = (formData.get("map_embed_url") as string) || "";

    const iframeMatch = rawMapUrl.match(/src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      rawMapUrl = iframeMatch[1];
    }

    updates.location_address = rawAddress.trim();
    updates.map_embed_url = rawMapUrl.trim();
  } else if (section === "appointments") {
    updates.booking_enabled = formData.get("booking_enabled") === "on";
    updates.booking_url = ((formData.get("booking_url") as string) || "").trim();
    updates.booking_title =
      ((formData.get("booking_title") as string) || "").trim() ||
      "Book an Appointment";
    updates.booking_description = (
      (formData.get("booking_description") as string) || ""
    ).trim();
    updates.booking_platform =
      (formData.get("booking_platform") as string) || "calendar";
  } else if (section === "catalog") {
    const actionType =
      ((formData.get("catalog_action_type") as string) || "view") === "download"
        ? "download"
        : "view";
    const rawPdfUrl = ((formData.get("catalog_pdf_url") as string) || "").trim();
    const rawCoverUrl = ((formData.get("catalog_cover_url") as string) || "").trim();

    updates.catalog_title =
      ((formData.get("catalog_title") as string) || "").trim() ||
      "View Product Catalog / Menu";
    updates.catalog_description = (
      (formData.get("catalog_description") as string) || ""
    ).trim();
    updates.catalog_action_type = actionType;
    updates.catalog_pdf_url = formatGoogleDriveUrl(rawPdfUrl, actionType);
    updates.catalog_cover_url = formatGoogleDriveUrl(rawCoverUrl, "image");
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/business");
  if (username) revalidatePath(`/@${username}`);
  return { success: true };
}

// 6. Public Click & Conversion Tracker for Appointments & Catalog
export async function trackBusinessHubClick(
  profileId: string,
  clickType: "booking" | "catalog"
) {
  if (!profileId) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("increment_business_hub_click", {
      target_profile_id: profileId,
      click_type: clickType,
    });
  } catch {
    // Non-blocking analytics call
  }
}