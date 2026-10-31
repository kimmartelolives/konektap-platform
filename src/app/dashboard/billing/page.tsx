import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shield, Zap, Sparkles, Check } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";
import { PromoTimer } from "./promo-timer";
import { connection } from "next/server";

async function BillingData({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ upgrade?: string; tier?: string }>;
}) {
  await connection();
  const resolvedSearchParams = await searchParamsPromise;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const currentTier = profile?.tier || "demo";

  const { data: plans } = await supabase.from("pricing_tiers").select("*");
  const demoPlan = plans?.find((p) => p.id === "demo");
  const standardPlan = plans?.find((p) => p.id === "standard");
  const premiumPlan = plans?.find((p) => p.id === "premium");

  const now = new Date();
  const getPriceInfo = (plan: any) => {
    if (!plan) return { finalPrice: 0, originalPrice: 0, isSale: false, endDate: null };
    const isSale =
      plan.discount_price !== null &&
      plan.discount_end_date &&
      new Date(plan.discount_end_date) > now;
    return {
      finalPrice: isSale ? plan.discount_price : plan.base_price,
      originalPrice: plan.base_price,
      isSale,
      endDate: plan.discount_end_date,
    };
  };

  const std = getPriceInfo(standardPlan);
  const prm = getPriceInfo(premiumPlan);

  return (
    <>
      {resolvedSearchParams?.upgrade === "success" && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5" />
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-sm opacity-80">
              Your account has been upgraded. If your tier badge hasn't updated yet, refresh the page in a few seconds.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 pt-4">
        {/* FREE TIER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col relative shadow-sm">
          {currentTier === "demo" && (
            <div className="absolute top-4 right-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/20">
              Current Plan
            </div>
          )}
          <Shield className="w-10 h-10 text-slate-400 dark:text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{demoPlan?.name || "Free Tier"}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{demoPlan?.description}</p>
          <div className="my-6">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₱0</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {(demoPlan?.features || []).map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> 
                <span className="flex-1">{feature}</span>
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-sm cursor-not-allowed">
            Active Plan
          </button>
        </div>

        {/* STANDARD TIER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col relative shadow-sm">
          {currentTier === "standard" && (
            <div className="absolute top-4 right-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/20">
              Current Plan
            </div>
          )}
          <Zap className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{standardPlan?.name || "Standard"}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{standardPlan?.description}</p>
          
          <div className="my-6">
            {std.isSale && std.endDate && <PromoTimer endDate={std.endDate} />}
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₱{std.finalPrice}</span>
              <span className="text-sm text-slate-500 mb-1">/ one-time</span>
              {std.isSale && (
                <span className="text-sm text-rose-500 dark:text-rose-400 line-through mb-1 ml-1">₱{std.originalPrice}</span>
              )}
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {(standardPlan?.features || []).map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> 
                <span className="flex-1">{feature}</span>
              </li>
            ))}
          </ul>
          {currentTier === "standard" || currentTier === "premium" ? (
             <button disabled className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-sm cursor-not-allowed">
               Already Upgraded
             </button>
          ) : (
            <UpgradeButton tier="standard" label="Upgrade to Standard" />
          )}
        </div>

        {/* PREMIUM TIER */}
        <div className="bg-indigo-50/50 dark:bg-[#0f111a] border border-indigo-200 dark:border-indigo-500/30 rounded-3xl p-6 flex flex-col relative shadow-xl shadow-indigo-100 dark:shadow-indigo-500/10">
          <div className="absolute -top-3 right-6 text-xs font-bold text-white bg-indigo-500 px-4 py-1 rounded-full">
            MOST POPULAR
          </div>
          {currentTier === "premium" && (
            <div className="absolute top-4 right-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/20">
              Current Plan
            </div>
          )}
          <Sparkles className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{premiumPlan?.name || "Premium"}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{premiumPlan?.description}</p>
          
          <div className="my-6">
            {prm.isSale && prm.endDate && <PromoTimer endDate={prm.endDate} />}
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₱{prm.finalPrice}</span>
              <span className="text-sm text-slate-500 mb-1">/ one-time</span>
              {prm.isSale && (
                <span className="text-sm text-rose-500 dark:text-rose-400 line-through mb-1 ml-1">₱{prm.originalPrice}</span>
              )}
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {(premiumPlan?.features || []).map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> 
                <span className="flex-1">{feature}</span>
              </li>
            ))}
          </ul>
          {currentTier === "premium" ? (
             <button disabled className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-semibold text-sm cursor-not-allowed">
               Already Upgraded
             </button>
          ) : (
            <UpgradeButton tier="premium" label="Upgrade to Premium" isPopular={true} />
          )}
        </div>
      </div>
    </>
  );
}

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; tier?: string }>;
}) {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
            💳
          </span>
          Plans & Billing
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upgrade your KonekTap tier via GCash, Maya, QR Ph, or Card powered by Xendit.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid md:grid-cols-3 gap-6 pt-4 animate-pulse">
            <div className="h-[500px] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-[500px] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-[500px] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        }
      >
        <BillingData searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  );
}