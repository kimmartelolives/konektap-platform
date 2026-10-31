import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
// 1. Tinanggal ang hasTierAccess sa import line na ito
import TierGate, { AccountTier } from "@/components/dashboard/TierGate";
import { LeadsManager } from "@/components/dashboard/leads-manager";

async function LeadsContent() {
  await connection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, show_lead_form")
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier as AccountTier) || "demo";
  const showLeadForm = profile?.show_lead_form ?? true;

  // 2. Pinalitan ng inline check (userTier === "standard" || userTier === "premium")
  let leads: any[] = [];
  if (userTier === "standard" || userTier === "premium") {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    leads = data || [];
  }

  return (
    <TierGate
      userTier={userTier}
      requiredTier="standard"
      featureName="Lead Capture Form & Inbox"
      description="Collect the name, mobile number, email, and message of clients who tapped your KonekTap NFC card."
    >
      <LeadsManager
        initialLeads={leads}
        showLeadForm={showLeadForm}
        serverNow={Date.now()}
      />
    </TierGate>
  );
}

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Captured Leads
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          People who left their contact details from your public NFC profile.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading leads...</p>
        </div>
      }>
        <LeadsContent />
      </Suspense>
    </div>
  );
}