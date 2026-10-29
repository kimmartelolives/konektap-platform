"use server";

import { createClient } from "@/lib/supabase/server";

export async function trackProfileView(username: string) {
  const supabase = await createClient();
  
  // Tatawagin nito yung SQL Function na ginawa natin kanina
  await supabase.rpc('increment_profile_views', { 
    profile_username: username 
  });
}

export async function trackLinkClick(linkId: string) {
  const supabase = await createClient();
  await supabase.rpc('increment_link_clicks', { link_id: linkId });
}

export async function trackVcardDownload(username: string) {
  const supabase = await createClient();
  await supabase.rpc('increment_vcard_downloads', { profile_username: username });
}