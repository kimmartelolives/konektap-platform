import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  // Idinagdag natin ang { status: 303 } para pilitin itong maging GET request papunta sa login page
  return NextResponse.redirect(`${url.origin}/login`, { status: 303 });
}