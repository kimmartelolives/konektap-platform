import { Lock, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export type AccountTier = "demo" | "standard" | "premium";

const TIER_RANK: Record<AccountTier, number> = {
  demo: 0,
  standard: 1,
  premium: 2,
};

export const TIER_CONFIG: Record<
  AccountTier,
  {
    label: string;
    price: string;
    badgeClass: string;
    maxSocialLinks: number;
    maxPortfolioItems: number;
  }
> = {
  demo: {
    label: "DEMO",
    price: "Free Trial",
    badgeClass: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    maxSocialLinks: 2,
    maxPortfolioItems: 0,
  },
  standard: {
    label: "STANDARD",
    price: "₱799",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    maxSocialLinks: 10,
    maxPortfolioItems: 6,
  },
  premium: {
    label: "PREMIUM",
    price: "₱1,499",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    maxSocialLinks: 99,
    maxPortfolioItems: 99,
  },
};

export function hasTierAccess(userTier: AccountTier, requiredTier: AccountTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

interface TierGateProps {
  userTier: AccountTier;
  requiredTier: "standard" | "premium";
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export default function TierGate({
  userTier,
  requiredTier,
  featureName,
  description,
  children,
}: TierGateProps) {
  if (hasTierAccess(userTier, requiredTier)) {
    return <>{children}</>;
  }

  const targetPlan = TIER_CONFIG[requiredTier];

  const benefits =
    requiredTier === "standard"
      ? [
          "Expanded Social Media Links (up to 10)",
          "Portfolio / Work Gallery (up to 6 photos)",
          "Lead Capture Form & Inbox",
          "Custom Appearance & Themes",
          "Remove Demo Watermark",
        ]
      : [
          "Unlimited Social Networks & Advanced Gallery",
          "Services & Pricing Display",
          "Interactive Map / Location Embed",
          "Appointment Scheduling System",
          "PDF Catalog / Menu Viewer",
        ];

  return (
    <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 p-6 md:p-10 text-center max-w-xl mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-brand-600 dark:text-brand-400" />
      </div>

      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${targetPlan.badgeClass}`}>
        <Sparkles className="w-3.5 h-3.5" />
        Requires {targetPlan.label} Plan ({targetPlan.price})
      </span>

      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Unlock {featureName}
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        {description ||
          `${featureName} is exclusively available for ${targetPlan.label} (${targetPlan.price}) accounts and above.`}
      </p>

      <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-4 text-left space-y-2.5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Included in the {targetPlan.label} Upgrade:
        </p>
        {benefits.map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/nfc-cards"
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg transition"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to {targetPlan.label} ({targetPlan.price})
      </Link>
    </div>
  );
}