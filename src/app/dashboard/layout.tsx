"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette,
  CreditCard,
  BarChart,
  LogOut,
  Wifi,
  Inbox,
  Briefcase,
  Lock,
  Loader2,
  Sparkles,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client"; // Client-side supabase para sa client component
import { Suspense, useEffect, useRef, useState } from "react";
import MobileNav from "@/components/dashboard/MobileNav";
import { AccountTier, TIER_CONFIG } from "@/components/dashboard/TierGate";

// TODO: palitan ng actual login route / upgrade link mo
const LOGIN_PATH = "/login";
const UPGRADE_URL = "https://facebook.com";

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  minTier?: AccountTier;
};

const navLinks: NavLink[] = [
  { name: "Overview", href: "/dashboard", icon: BarChart },
  { name: "Profile Info", href: "/dashboard/profile", icon: User },
  { name: "Social Links", href: "/dashboard/links", icon: LinkIcon },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: ImageIcon, minTier: "standard" },
  { name: "Leads", href: "/dashboard/leads", icon: Inbox, minTier: "standard" },
  { name: "Business Hub", href: "/dashboard/business", icon: Briefcase, minTier: "premium" },
  { name: "Appearance", href: "/dashboard/appearance", icon: Palette, minTier: "standard" },
  { name: "NFC Cards", href: "/dashboard/nfc-cards", icon: CreditCard, minTier: "standard" },
];

// Higher rank = higher plan. Easy to extend if a new tier is added.
const TIER_RANK: Record<string, number> = { demo: 0, standard: 1, premium: 2 };

function isKnownTier(value: unknown): value is AccountTier {
  return typeof value === "string" && value in TIER_RANK;
}

function hasAccess(userTier: AccountTier, minTier?: AccountTier): boolean {
  if (!minTier) return true;
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[minTier] ?? 0);
}

function planLabel(tier: AccountTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// Highlights sub-routes too (e.g. /dashboard/portfolio/new), but keeps Overview exact
function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Client component para sa nav links para masupport ang active path at tier check
function SidebarNavLinksClient({ tier }: { tier: AccountTier }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Dashboard" className="flex-1 overflow-y-auto p-4 space-y-1">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const accessible = hasAccess(tier, link.minTier);
        const isActive = isLinkActive(pathname, link.href);

        return (
          <Link
            key={link.name}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${
              isActive
                ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                aria-hidden="true"
                className={`w-4 h-4 ${isActive ? "text-brand-600 dark:text-brand-400" : ""}`}
              />
              <span>{link.name}</span>
            </div>
            {!accessible && link.minTier && (
              <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 group-hover:text-brand-500 transition-colors">
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {planLabel(link.minTier)}
                </span>
                <Lock aria-hidden="true" className="w-3.5 h-3.5" />
                <span className="sr-only">Requires {planLabel(link.minTier)} plan</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Must be rendered inside the <form> so useFormStatus can read its pending state
function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userTier, setUserTier] = useState<AccountTier>("demo");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let redirecting = false;

    async function fetchInfo() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        // Not signed in (or session expired): send them to login
        if (authError || !user) {
          redirecting = true;
          router.replace(LOGIN_PATH);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        setUserEmail(user.email);
        if (profileError) {
          console.error("Profile fetch error:", profileError);
          setLoadError(true);
        }
        setUserTier(isKnownTier(profile?.tier) ? profile.tier : "demo");
      } catch (err) {
        if (cancelled) return;
        console.error("Dashboard layout error:", err);
        setLoadError(true);
      } finally {
        // Keep the skeleton up while redirecting to avoid a flash of demo-tier UI
        if (!cancelled && !redirecting) setLoading(false);
      }
    }

    fetchInfo();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // <main> is its own scroll container, so reset its scroll on every page change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const badge = TIER_CONFIG[userTier];
  const canUpgrade = !loading && userTier !== "premium";

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row">
      {/* Skip link for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Mobile Hamburger Header */}
      <MobileNav userEmail={userEmail} userTier={userTier} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass-card border-r border-slate-200 dark:border-white/10 flex-col shrink-0 h-full z-30">
        {/* LOGO */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Wifi className="rotate-90 text-white w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
            KonekTap
          </span>
        </div>

        {/* NAVIGATION WITH ACTIVE HIGHLIGHT & PLAN LOCKS */}
        {loading ? (
          <nav
            aria-label="Dashboard"
            aria-busy="true"
            className="flex-1 p-4 space-y-1 animate-pulse"
          >
            {navLinks.map((l) => (
              <div key={l.name} className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl mb-1" />
            ))}
          </nav>
        ) : (
          <SidebarNavLinksClient tier={userTier} />
        )}

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0 bg-white/50 dark:bg-dark-900/50">
          <div className="px-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Account Plan
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>

            {loadError && (
              <p
                role="alert"
                className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                Couldn&apos;t load your plan. Showing limited access. Refresh to try again.
              </p>
            )}
          </div>

          {canUpgrade && (
            <a
              href={UPGRADE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Plan
            </a>
          )}

          <form action="/auth/logout" method="POST">
            <SignOutButton />
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="flex-1 h-full overflow-y-auto p-4 md:p-10 relative focus:outline-none"
      >
        <div className="max-w-4xl mx-auto">
          <Suspense
            fallback={<div className="animate-pulse h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />}
          >
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}