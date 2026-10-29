import Link from "next/link";
import { User, Link as LinkIcon, Image, Palette, CreditCard, BarChart, LogOut, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { connection } from "next/server";

// Isolate the dynamic cookie read into its own async component for Next.js 15
async function SidebarUserInfo() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400 truncate px-3 mb-2">
      {user?.email}
    </p>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: BarChart },
    { name: "Profile Info", href: "/dashboard/profile", icon: User },
    { name: "Social Links", href: "/dashboard/links", icon: LinkIcon },
    { name: "Portfolio", href: "/dashboard/portfolio", icon: Image },
    { name: "Appearance", href: "/dashboard/appearance", icon: Palette },
    { name: "NFC Cards", href: "/dashboard/nfc-cards", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row">
      {/* Sidebar / Top Navigation for Mobile */}
      <aside className="w-full md:w-64 glass-card border-b md:border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 md:min-h-screen sticky top-0 z-30">
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
              <Wifi className="rotate-90 text-white w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">KonekTap</span>
          </div>

          {/* Mobile-only compact user / sign out trigger or minimalist indicator if needed */}
        </div>
        
        {/* Navigation Links: Scrollable horizontally on mobile without ugly scrollbars, vertical on desktop */}
        <nav className="flex-1 p-2 md:p-4 flex md:flex-col gap-1.5 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white transition whitespace-shrink-0 shrink-0 md:shrink"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap md:whitespace-normal">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Sign Out (Hidden or compacted on mobile view to save vertical space, full on desktop) */}
        <div className="hidden md:block p-4 border-t border-slate-200 dark:border-white/10">
          <Suspense fallback={<div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2 ml-3"></div>}>
            <SidebarUserInfo />
          </Suspense>
          
          <form action="/auth/logout" method="POST">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>

        {/* Mobile bottom/side compact bar for Sign Out to prevent long scrolling */}
        <div className="flex md:hidden items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-dark-900/50">
          <div className="max-w-[200px]">
            <Suspense fallback={<div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>}>
              <SidebarUserInfo />
            </Suspense>
          </div>
          <form action="/auth/logout" method="POST">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}