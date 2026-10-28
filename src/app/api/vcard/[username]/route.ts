import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile || !profile.is_published) {
    return new NextResponse("Profile not found or unpublished", { status: 404 });
  }

  // Generate the vCard 3.0 string with KonekTap branding
  const vcfLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${profile.full_name || ''};;;`,
    `FN:${profile.full_name || ''}`,
    `TITLE:${profile.profession || ''}`,
    `ORG:KonekTap Verified Professional`,
    `TEL;TYPE=CELL,VOICE:${profile.phone_public || ''}`,
    `EMAIL;TYPE=PREF,INTERNET:${profile.email_public || ''}`,
    `URL:https://konektap.com/${profile.username}`,
    `NOTE:View full interactive profile: https://konektap.com/${profile.username}`,
    'END:VCARD'
  ];
  const vcfContent = vcfLines.join('\r\n');

  return new NextResponse(vcfContent, {
    headers: {
      'Content-Type': 'text/vcard;charset=utf-8',
      'Content-Disposition': `attachment; filename="${profile.username}-contact.vcf"`,
    },
  });
}