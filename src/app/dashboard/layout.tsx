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
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-card border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 md:min-h-screen sticky top-0 z-30">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Wifi className="rotate-90 text-white w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">Dashboard</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto flex md:block gap-2 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white transition whitespace-nowrap md:whitespace-normal"
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/10">
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}