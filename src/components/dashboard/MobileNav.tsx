"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Wifi,
  User,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette,
  CreditCard,
  BarChart,
  LogOut,
  Lock,
  Inbox,
  Briefcase,
  Loader2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { AccountTier, TIER_CONFIG, hasTierAccess } from "./TierGate";

// TODO: palitan ng actual upgrade link mo (same value as sa layout.tsx)
const UPGRADE_URL = "https://facebook.com";

interface MobileNavProps {
  userEmail?: string;
  userTier?: AccountTier;
}

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  minTier?: AccountTier;
};

// Module-level so the array isn't re-created on every render
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

function planLabel(tier: AccountTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// Highlights sub-routes too (e.g. /dashboard/portfolio/new), but keeps Overview exact
function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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

export default function MobileNav({ userEmail, userTier = "demo" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const badge = TIER_CONFIG[userTier];
  const canUpgrade = userTier !== "premium";

  // Close the menu whenever the route changes (covers back/forward and in-page links)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Escape closes the menu and returns focus to the toggle button
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="md:hidden w-full bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
      {/* Tap outside the menu to close it */}
      {isOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-0 bg-black/30 cursor-default"
        />
      )}

      {/* Top Bar Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-md">
            <Wifi className="rotate-90 text-white w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-base text-slate-900 dark:text-white">
            KonekTap
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
            {badge.label}
          </span>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls={menuId}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Dropdown Menu when Hamburger is Clicked */}
      {isOpen && (
        <div
          id={menuId}
          className="absolute top-full left-0 z-10 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 shadow-xl py-4 px-4 space-y-3"
        >
          <nav aria-label="Dashboard" className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isLocked = link.minTier ? !hasTierAccess(userTier, link.minTier) : false;
              const isActive = isLinkActive(pathname, link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${
                    isActive
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      aria-hidden="true"
                      className="w-4 h-4 text-brand-600 dark:text-brand-400"
                    />
                    <span>{link.name}</span>
                  </div>
                  {isLocked && link.minTier && (
                    <span className="flex items-center gap-1.5 text-slate-400">
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

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
            {userEmail && (
              <div className="flex items-center justify-between gap-2 px-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {userEmail}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
                  {badge.label}
                </span>
              </div>
            )}

            {canUpgrade && (
              <a
                href={UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Plan
              </a>
            )}

            <form action="/auth/logout" method="POST">
              <SignOutButton />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}