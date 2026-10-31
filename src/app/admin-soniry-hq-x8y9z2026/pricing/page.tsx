import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PricingManager } from "./pricing-manager";
import { Tag, Loader2, AlertTriangle } from "lucide-react";
import { Suspense } from "react";

export const instant = false;

// Loading box: kapareho ng loader sa User Management page
function PricingLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]"
    >
      <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Loading pricing and promos...
      </p>
    </div>
  );
}

// Data fetching lang ang nasa loob, para lumabas agad ang header
async function PricingContent() {
  await connection();

  const supabase = await createClient();

  const { data: plans, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .order("base_price", { ascending: true });

  if (error) {
    console.error("[admin] fetch pricing failed:", error);
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/5"
      >
        <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Couldn&apos;t load the pricing data
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Please check your database connection and refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <PricingManager initialPlans={plans || []} />
    </div>
  );
}

export default function AdminPricingPage() {
  return (
    <div className="space-y-6">
      {/* HEADER SECTION (static, lumalabas agad) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Tag className="w-8 h-8 text-brand-500" />
            Pricing & Promos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your subscription tiers, feature lists, and flash sales.
          </p>
        </div>
      </div>

      {/* CONTENT SECTION: dito lang ang loading box */}
      <div className="pt-2">
        <Suspense fallback={<PricingLoading />}>
          <PricingContent />
        </Suspense>
      </div>
    </div>
  );
}