import Link from "next/link";
// 1. Idinagdag ang 'Inbox' dito sa import:
import { User, Link as LinkIcon, Image, Palette, CreditCard, BarChart, LogOut, Wifi, Inbox, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { connection } from "next/server";
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

async function getUserAccountInfo(): Promise<{ email?: string; tier: AccountTier }> {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { email: undefined, tier: "demo" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const tier = (profile?.tier as AccountTier) || "demo";
  return { email: user.email, tier };
}

async function SidebarUserInfo() {
  const { email, tier } = await getUserAccountInfo();
  const badge = TIER_CONFIG[tier];

  return (
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
        {email}
      </p>
    </div>
  );
}

async function MobileNavWithUser() {
  const { email, tier } = await getUserAccountInfo();
  return <MobileNav userEmail={email} userTier={tier} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row">
      {/* Mobile Hamburger Header */}
      <Suspense fallback={<MobileNav />}>
        <MobileNavWithUser />
      </Suspense>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass-card border-r border-slate-200 dark:border-white/10 flex-col shrink-0 min-h-screen sticky top-0 z-30">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Wifi className="rotate-90 text-white w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">KonekTap</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white transition"
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/10">
          <Suspense fallback={<div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2" />}>
            <SidebarUserInfo />
          </Suspense>

          <form action="/auth/logout" method="POST">
            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<div className="animate-pulse h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}