import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NfcCardManager } from "@/components/dashboard/nfc-card-manager";

// Listahan ng iyong Admin emails na pwedeng makakita ng Manufacturing Tools
const ADMIN_EMAILS = [
  "kimmartel.olives@gmail.com",
  "wakicustomshop@gmail.com",
];

async function NfcContent() {
  await connection();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_published")
    .eq("id", user.id)
    .single();

  if (!profile?.username) {
    return (
      <div className="glass-card p-8 rounded-3xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-semibold mb-2">No KonekTap Link Found</p>
        <p className="text-sm text-rose-500 dark:text-rose-300">Please go to Profile Info and claim your custom URL first.</p>
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
  const profileUrl = `${baseUrl}/@${profile.username}`;

  // Check kung ikaw ang naka-login
  const isAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false;

  return (
    <NfcCardManager 
      profileUrl={profileUrl} 
      username={profile.username} 
      isPublished={!!profile.is_published}
      isAdmin={isAdmin}
    />
  );
}

export default function NfcPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Smart Card & QR Pass
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your active KonekTap link and download your backup QR pass.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading your smart card details...</p>
        </div>
      }>
        <NfcContent />
      </Suspense>
    </div>
  );
}