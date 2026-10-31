import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PricingCards } from "@/components/dashboard/pricing-cards";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { connection } from "next/server";

export const instant = false;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; tier?: string }>;
}) {
  await connection();
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const rawTier = profile?.tier;
  const currentTier =
    rawTier === "standard" || rawTier === "premium" ? rawTier : "demo";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-brand-500" />
          Plans &amp; Billing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upgrade your KonekTap tier via GCash, Maya, QR Ph, or Card powered by PayMongo.
        </p>
      </div>

      {params.upgrade === "success" && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-bold">Payment successful!</p>
            <p className="text-xs opacity-90">
              Your account has been upgraded. If your tier badge hasn&apos;t updated yet, refresh the page in a few seconds.
            </p>
          </div>
        </div>
      )}

      {params.upgrade === "cancelled" && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium flex items-center gap-3">
          <XCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <span>Payment was cancelled. No charges were made to your account.</span>
        </div>
      )}

      <PricingCards currentTier={currentTier} />
    </div>
  );
}