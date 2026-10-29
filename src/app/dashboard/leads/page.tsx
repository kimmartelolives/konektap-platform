import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import TierGate, { AccountTier } from "@/components/dashboard/TierGate";
import { toggleLeadCaptureForm, deleteLead } from "./actions";
import { Inbox, Phone, Mail, MessageSquare, Trash2, Calendar, CheckCircle2, EyeOff } from "lucide-react";

async function LeadsInboxContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, show_lead_form")
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier as AccountTier) || "demo";
  const showLeadForm = profile?.show_lead_form ?? true;

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TierGate
      userTier={userTier}
      requiredTier="standard"
      featureName="Lead Capture Form & Inbox"
      description="Collect the name, mobile number, email, and message of clients who tapped your KonekTap NFC card."
    >
      <div className="space-y-6">
        {/* Header & Toggle Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Inbox className="w-6 h-6 text-brand-500" />
              Captured Leads
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              People who left their contact details from your public NFC profile.
            </p>
          </div>

          <form action={toggleLeadCaptureForm}>
            <input type="hidden" name="show_lead_form" value={(!showLeadForm).toString()} />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                showLeadForm
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              }`}
            >
              {showLeadForm ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Form Active on Profile
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Form Hidden (Click to Enable)
                </>
              )}
            </button>
          </form>
        </div>

        {/* Leads List */}
        {!leads || leads.length === 0 ? (
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No leads yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              When someone fills out the "Share Your Contact Info" form on your public card, they'll show up here right away.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {lead.visitor_name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(lead.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    {lead.visitor_phone && (
                      <a
                        href={`tel:${lead.visitor_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-brand-500 transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-brand-500" />
                        {lead.visitor_phone}
                      </a>
                    )}
                    {lead.visitor_phone && (
                      <a
                        href={`sms:${lead.visitor_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send SMS
                      </a>
                    )}
                    {lead.visitor_email && (
                      <a
                        href={`mailto:${lead.visitor_email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-brand-500 transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-brand-500" />
                        {lead.visitor_email}
                      </a>
                    )}
                  </div>

                  {lead.message && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                      "{lead.message}"
                    </p>
                  )}
                </div>

                <form action={deleteLead}>
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <button
                    type="submit"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                    title="Delete Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </TierGate>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
      <LeadsInboxContent />
    </Suspense>
  );
}