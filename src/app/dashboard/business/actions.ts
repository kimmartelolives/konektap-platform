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

// 5. Update Map, Appointments, or Catalog Settings
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
    
    // Capture manual pin coordinates if provided
    const lat = formData.get("latitude");
    const lng = formData.get("longitude");
    updates.latitude = lat ? Number(lat) : null;
    updates.longitude = lng ? Number(lng) : null;

  } else if (section === "appointments") {
    updates.booking_enabled = formData.get("booking_enabled") === "on";
    updates.booking_url = formData.get("booking_url") as string;
  } else if (section === "catalog") {
    updates.catalog_title = (formData.get("catalog_title") as string) || "View Product Catalog / Menu";
    
    const pdfFile = formData.get("catalog_file") as File | null;
    const directUrl = formData.get("catalog_pdf_url") as string;

    if (pdfFile && pdfFile.size > 0) {
      const fileExt = pdfFile.name.split(".").pop();
      const fileName = `${user.id}-catalog-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(fileName, pdfFile, { upsert: true });

      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(fileName);

      updates.catalog_pdf_url = publicUrlData.publicUrl;
    } else if (directUrl !== null) {
      updates.catalog_pdf_url = directUrl;
    }
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