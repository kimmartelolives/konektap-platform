"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Para sa Public Profile: Pag-submit ng visitor ng kanilang contact info
export async function submitPublicLead(formData: FormData) {
  const supabase = await createClient();

  const profile_id = formData.get("profile_id") as string;
  const username = formData.get("username") as string;
  const visitor_name = (formData.get("visitor_name") as string)?.trim();
  const visitor_email = (formData.get("visitor_email") as string)?.trim();
  const visitor_phone = (formData.get("visitor_phone") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!profile_id || !visitor_name) {
    return { error: "Name is required." };
  }

  const { error } = await supabase.from("leads").insert({
    profile_id,
    visitor_name,
    visitor_email: visitor_email || null,
    visitor_phone: visitor_phone || null,
    message: message || null,
  });

  if (error) {
    return { error: "Failed to send details. Please try again." };
  }

  if (username) {
    revalidatePath(`/${username}`);
  }
  return { success: true };
}

// Para sa Dashboard: Turn On / Off ng Lead Capture Form sa Public Profile
export async function toggleLeadCaptureForm(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const show_lead_form = formData.get("show_lead_form") === "true";

  await supabase
    .from("profiles")
    .update({ show_lead_form })
    .eq("id", user.id);

  revalidatePath("/dashboard/leads");
}

// Para sa Dashboard: Pagbura ng isang lead entry
export async function deleteLead(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const leadId = formData.get("lead_id") as string;

  await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("profile_id", user.id);

  revalidatePath("/dashboard/leads");
}