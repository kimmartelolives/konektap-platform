import { redirect } from "next/navigation";
import { verifyAdmin } from "./actions";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import AdminMobileNav, { AdminDesktopNav } from "@/components/admin/AdminMobileNav";

// Payagan ang blocking route (walang Suspense boundary requirement)
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pilitin ang Next.js na i-render ito dynamically sa request time
  await connection();

  const admin = await verifyAdmin();
  if (!admin) redirect("/dashboard");

  // Kunin ang email ng admin para sa footer
  const userEmail = admin.email;

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row">

      {/* Mobile Hamburger Header (Lilitaw lang sa Mobile) */}
      <AdminMobileNav />

      {/* Desktop Sidebar (100% Identical sa layout-user.tsx) */}
      <aside className="hidden md:flex w-64 glass-card border-r border-slate-200 dark:border-white/10 flex-col shrink-0 h-full z-30">

        {/* LOGO */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
            KonekTap <span className="text-brand-600 dark:text-brand-400">Admin</span>
          </span>
        </div>

        {/* NAVIGATION WITH ACTIVE HIGHLIGHT (client component, nasa AdminMobileNav.tsx) */}
        <AdminDesktopNav />

        {/* FOOTER AREA (Kaparehas ng user profile layout) */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0 bg-white/50 dark:bg-dark-900/50">
          <div className="px-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Account Role
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
          </div>

          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-10 relative focus:outline-none">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}