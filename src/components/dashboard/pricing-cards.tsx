"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/app/dashboard/billing/actions";
import { Check, Sparkles, Zap, Shield, Loader2, AlertCircle } from "lucide-react";

type Tier = "demo" | "standard" | "premium";

const TIER_RANK: Record<Tier, number> = {
  demo: 0,
  standard: 1,
  premium: 2,
};

export function PricingCards({ currentTier }: { currentTier: Tier }) {
  const [isPending, startTransition] = useTransition();
  const [loadingTier, setLoadingTier] = useState<"standard" | "premium" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = (targetTier: "standard" | "premium") => {
    setError(null);
    setLoadingTier(targetTier);

    startTransition(async () => {
      try {
        const res = await createCheckoutSession(targetTier);
        if (res?.error) {
          setError(res.error);
          setLoadingTier(null);
          return;
        }
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        }
      } catch {
        setError("Nagkaroon ng problema sa pag-connect sa PayMongo. Subukan ulit.");
        setLoadingTier(null);
      }
    });
  };

  const plans = [
    {
      id: "demo" as const,
      name: "Free Tier",
      price: "₱0",
      subtitle: "Para sa mga nagsisimula pa lang",
      icon: Shield,
      features: [
        "1 Digital Profile Card",
        "Hanggang 3 Social Links",
        "Basic QR Code Sharing",
        "Standard KonekTap Branding",
      ],
      popular: false,
    },
    {
      id: "standard" as const,
      name: "Standard",
      price: "₱299",
      subtitle: "One-time upgrade para sa professionals",
      icon: Zap,
      features: [
        "Lahat ng nasa Free Tier",
        "Hanggang 10 Social Links",
        "NFC Card Tap Integration",
        "Lead Capture Form",
        "Basic Tap Analytics",
      ],
      popular: false,
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: "₱599",
      subtitle: "Full power para sa negosyo at creators",
      icon: Sparkles,
      features: [
        "Lahat ng nasa Standard Tier",
        "Unlimited Social & Custom Links",
        "Custom Theme & Brand Colors",
        "Advanced Analytics & Leads Export",
        "Priority Support & Verified Badge",
      ],
      popular: true,
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentTier === plan.id;
          const isLower = TIER_RANK[plan.id] < TIER_RANK[currentTier];
          const isBusy = isPending && loadingTier === plan.id;

          return (
            <div
              key={plan.id}
              className={`glass-card p-6 md:p-8 rounded-3xl flex flex-col justify-between relative transition-all ${
                plan.popular
                  ? "border-2 border-brand-500 bg-white dark:bg-dark-900 shadow-xl shadow-brand-500/10"
                  : "border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 shadow-sm"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-600 text-white shadow-md">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      plan.popular
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 dark:bg-white/5 text-brand-600 dark:text-brand-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isCurrent && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Current Plan
                    </span>
                  )}
                </div>

                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {plan.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {plan.subtitle}
                </p>

                <div className="my-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.id !== "demo" && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      / one-time
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <Check className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.id === "demo" || isCurrent || isLower ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                >
                  {isCurrent ? "Active Plan" : "Included in your plan"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                    plan.popular
                      ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                      : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                  }`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to PayMongo...
                    </>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}