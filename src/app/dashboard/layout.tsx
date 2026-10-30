"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Link as LinkIcon, Image, Palette, CreditCard, BarChart, LogOut, Wifi, Inbox, Briefcase, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // Client-side supabase para sa client component
import { Suspense, useEffect, useState } from "react";
import MobileNav from "@/components/dashboard/MobileNav";
import { AccountTier, TIER_CONFIG } from "@/components/dashboard/TierGate";

const navLinks: Array<{ name: string; href: string; icon: any; minTier?: AccountTier }> = [
  { name: "Overview", href: "/dashboard", icon: BarChart },
  { name: "Profile Info", href: "/dashboard/profile", icon: User },
  { name: "Social Links", href: "/dashboard/links", icon: LinkIcon },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Image, minTier: "standard" },
  { name: "Leads", href: "/dashboard/leads", icon: Inbox, minTier: "standard" },
  { name: "Business Hub", href: "/dashboard/business", icon: Briefcase, minTier: "premium" },
  { name: "Appearance", href: "/dashboard/appearance", icon: Palette, minTier: "standard" },
  { name: "NFC Cards", href: "/dashboard/nfc-cards", icon: CreditCard, minTier: "standard" },
];

function hasAccess(userTier: AccountTier, minTier?: AccountTier): boolean {
  if (!minTier) return true;
  if (userTier === "premium") return true;
  if (userTier === "standard" && minTier === "standard") return true;
  return false;
}

// Client component para sa nav links para masupport ang active path at tier check
function SidebarNavLinksClient({ tier }: { tier: AccountTier }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const accessible = hasAccess(tier, link.minTier);
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition group ${
              isActive
                ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-600 dark:text-brand-400" : ""}`} />
              <span>{link.name}</span>
            </div>
            {!accessible && (
              <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-brand-500 transition-colors" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userTier, setUserTier] = useState<AccountTier>("demo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInfo() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", user.id)
          .single();
        setUserEmail(user.email);
        setUserTier((profile?.tier as AccountTier) || "demo");
      }
      setLoading(false);
    }
    fetchInfo();
  }, []);

  const badge = TIER_CONFIG[userTier];

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row">
      
      {/* Mobile Hamburger Header */}
      <MobileNav userEmail={userEmail} userTier={userTier} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass-card border-r border-slate-200 dark:border-white/10 flex-col shrink-0 h-full z-30">
        
        {/* LOGO */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Wifi className="rotate-90 text-white w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">KonekTap</span>
        </div>

        {/* NAVIGATION WITH ACTIVE HIGHLIGHT & PADLOCK */}
        {loading ? (
          <nav className="flex-1 p-4 space-y-1 animate-pulse">
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
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {userEmail}
            </p>
          </div>

          <form action="/auth/logout" method="POST">
            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-10 relative">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<div className="animate-pulse h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}