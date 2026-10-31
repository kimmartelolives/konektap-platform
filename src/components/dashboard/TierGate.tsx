import { useId } from "react";
import { Lock, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const UPGRADE_URL = "/dashboard/billing";

export type AccountTier = "demo" | "standard" | "premium";

const TIER_RANK: Record<AccountTier, number> = {
  demo: 0,
  standard: 1,
  premium: 2,
};

export function isAccountTier(value: unknown): value is AccountTier {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TIER_RANK, value);
}

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
    price: "₱299",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    maxSocialLinks: 10,
    maxPortfolioItems: 6,
  },
  premium: {
    label: "PREMIUM",
    price: "₱599",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    maxSocialLinks: 99,
    maxPortfolioItems: 99,
  },
};

// Benefits are built from TIER_CONFIG so the limits shown here can never drift from the real ones
const TIER_BENEFITS: Record<"standard" | "premium", string[]> = {
  standard: [
    `Expanded Social Media Links (up to ${TIER_CONFIG.standard.maxSocialLinks})`,
    `Portfolio / Work Gallery (up to ${TIER_CONFIG.standard.maxPortfolioItems} photos)`,
    "Lead Capture Form & Inbox",
    "Custom Appearance & Themes",
    "Remove Demo Watermark",
  ],
  premium: [
    "Everything in Standard",
    "Unlimited Social Networks & Advanced Gallery",
    "Services & Pricing Display",
    "Interactive Map / Location Embed",
    "Appointment Scheduling System",
    "PDF Catalog / Menu Viewer",
  ],
};

// Fails closed: an unexpected or missing tier value is treated as the lowest tier
export function hasTierAccess(userTier: AccountTier, requiredTier: AccountTier): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

interface TierGateProps {
  userTier: AccountTier;
  requiredTier: "standard" | "premium";
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * UI-level gate only. Anything sensitive must also be enforced server-side
 * (server actions / RLS), since this component can't stop direct requests.
 */
export default function TierGate({
  userTier,
  requiredTier,
  featureName,
  description,
  children,
}: TierGateProps) {
  const headingId = useId();

  if (hasTierAccess(userTier, requiredTier)) {
    return <>{children}</>;
  }

  const targetPlan = TIER_CONFIG[requiredTier];
  const currentPlan = TIER_CONFIG[userTier] ?? TIER_CONFIG.demo;
  const benefits = TIER_BENEFITS[requiredTier];

  return (
    <section
      aria-labelledby={headingId}
      className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 p-6 md:p-10 text-center max-w-xl mx-auto my-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock aria-hidden="true" className="w-7 h-7 text-brand-600 dark:text-brand-400" />
      </div>

      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${targetPlan.badgeClass}`}
      >
        <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
        Requires {targetPlan.label} Plan ({targetPlan.price})
      </span>

      <h2
        id={headingId}
        className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2"
      >
        Unlock {featureName}
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        {description ||
          `${featureName} is exclusively available for ${targetPlan.label} (${targetPlan.price}) accounts and above.`}
      </p>

      <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">
        Your current plan:{" "}
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold align-middle ${currentPlan.badgeClass}`}>
          {currentPlan.label}
        </span>
      </p>

      <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-4 text-left mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Included in the {targetPlan.label} Upgrade:
        </p>
        <ul className="space-y-2.5">
          {benefits.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200"
            >
              <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4" />
          Back to Overview
        </Link>

        {/* Naka-link na sa /dashboard/billing gamit ang Next.js Link */}
        <Link
          href={UPGRADE_URL}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
        >
          <Sparkles aria-hidden="true" className="w-4 h-4" />
          Upgrade to {targetPlan.label} ({targetPlan.price})
        </Link>
      </div>
    </section>
  );
}