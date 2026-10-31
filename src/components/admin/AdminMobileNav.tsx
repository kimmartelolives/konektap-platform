"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Shield,
  Users,
  Activity,
  ArrowLeft,
  LogOut,
  Loader2,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useFormStatus } from "react-dom";

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const ADMIN_BASE = "/admin-soniry-hq-x8y9z2026";

// 2. Idagdag ang Pricing & Promos sa mainLinks
const mainLinks: NavLink[] = [
  { name: "Overview", href: ADMIN_BASE, icon: Activity },
  { name: "User Management", href: `${ADMIN_BASE}/users`, icon: Users },
  { name: "Pricing & Promos", href: `${ADMIN_BASE}/pricing`, icon: Tag },
];

const exitLink: NavLink = { name: "Exit to Dashboard", href: "/dashboard", icon: ArrowLeft };

const adminNavLinks: NavLink[] = [...mainLinks, exitLink];

function isLinkActive(pathname: string, href: string): boolean {
  // Ignore a trailing slash so "/users/" still matches
  const current = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  // Overview and Dashboard must match exactly, otherwise Overview
  // would also light up on /users
  if (href === ADMIN_BASE || href === "/dashboard") return current === href;
  return current === href || current.startsWith(`${href}/`);
}

// True lang pagkatapos mag-hydrate ang client component
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

// Skeleton ng nav: kapareho ng sa layout-user (animate-pulse blocks)
function NavSkeleton() {
  return (
    <nav
      aria-label="Admin Dashboard"
      aria-busy="true"
      className="flex-1 p-4 space-y-1 animate-pulse"
    >
      {mainLinks.map((link) => (
        <div
          key={link.href}
          className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl mb-1"
        />
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* DESKTOP SIDEBAR NAV                                                 */
/* Client component para magamit ang usePathname sa server layout.     */
/* ------------------------------------------------------------------ */
export function AdminDesktopNav() {
  const pathname = usePathname() ?? "";
  const mounted = useMounted();

  // Skeleton hangga't hindi pa handa ang client nav
  if (!mounted) return <NavSkeleton />;

  return (
    <nav aria-label="Admin Dashboard" className="flex-1 overflow-y-auto p-4 space-y-1">
      {mainLinks.map((link) => {
        const Icon = link.icon;
        const isActive = isLinkActive(pathname, link.href);

        return (
          <Link
            key={link.href}
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
                className={`w-4 h-4 ${isActive ? "text-brand-600 dark:text-brand-400" : ""}`}
              />
              <span>{link.name}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* MOBILE HEADER + MENU                                                */
/* ------------------------------------------------------------------ */
export default function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the menu after navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Escape closes the menu and returns focus to the toggle
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="md:hidden w-full bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          tabIndex={-1}
          aria-label="Close menu"
          className="fixed inset-0 z-0 bg-black/30 cursor-default"
        />
      )}

      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-md text-white">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-base text-slate-900 dark:text-white">
            KonekTap <span className="text-brand-600 dark:text-brand-400">Admin</span>
          </span>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isOpen && (
        <div
          id={menuId}
          className="absolute top-full left-0 z-10 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 shadow-xl py-4 px-4 space-y-3"
        >
          <nav aria-label="Admin Dashboard" className="space-y-1">
            {adminNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isLinkActive(pathname, link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${
                    isActive
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
            <form action="/auth/logout" method="POST">
              <SignOutButton />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}