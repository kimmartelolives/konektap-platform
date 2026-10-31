"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export async function updatePricing(formData: FormData) {
  const id = String(formData.get("id")).trim();
  const base_price_raw = formData.get("base_price");
  const discount_price_raw = formData.get("discount_price");
  const discount_end_date_raw = formData.get("discount_end_date");
  
  const description = String(formData.get("description") || "").trim();
  const featuresRaw = String(formData.get("features") || "");
  
  const features = featuresRaw
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  if (!id || id === "null" || id === "undefined") {
    throw new Error("Missing tier ID.");
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const base_price = parseFloat(String(base_price_raw));
  const discount_price = (discount_price_raw && String(discount_price_raw).trim() !== "") 
    ? parseFloat(String(discount_price_raw)) 
    : null;
  const discount_end_date = (discount_end_date_raw && String(discount_end_date_raw).trim() !== "") 
    ? new Date(String(discount_end_date_raw)).toISOString() 
    : null;

  const { data, error } = await supabaseAdmin
    .from("pricing_tiers")
    .update({
      base_price,
      discount_price,
      discount_end_date,
      description,
      features,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message); 
  }

  if (!data || data.length === 0) {
    throw new Error(`Walang na-update na row para sa ID na '${id}'.`);
  }

  // SOLUSYON 1: I-revalidate ang pinaka-root layout para ma-refresh lahat ng pages (Admin at User Dashboard)
  revalidatePath("/", "layout");
}