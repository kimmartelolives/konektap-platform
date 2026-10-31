import { getAdminStats } from "./actions";
import { connection } from "next/server";
import {
  Users,
  Star,
  UserPlus,
  Eye,
  Loader2,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { Suspense, type ReactNode } from "react";

// Reusable card so the 4 stat cards share one source of styling
type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  iconFill?: string;
  watermarkColor: string;
  iconBoxClass: string;
  valueClass?: string;
  badge?: ReactNode;
  footer?: ReactNode;
};

function StatCard({
  title,
  value,
  icon: Icon,
  iconFill,
  watermarkColor,
  iconBoxClass,
  valueClass = "text-slate-900 dark:text-white",
  badge,
  footer,
}: StatCardProps) {
  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-md shadow-slate-200/70 dark:shadow-none relative overflow-hidden">
      <div
        className="absolute -right-4 -bottom-4 opacity-[0.08] dark:opacity-10 pointer-events-none"
        aria-hidden="true"
      >
        <Icon className={`w-32 h-32 ${watermarkColor} dark:text-white`} />
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBoxClass}`}
        >
          <Icon className={`w-5 h-5 ${iconFill ?? ""}`} />
        </div>
        {badge}
      </div>

      <div className="relative z-10">
        <h3 className="font-bold text-sm text-slate-600 dark:text-slate-300 mb-1">
          {title}
        </h3>
        <span className={`text-3xl font-display font-bold ${valueClass}`}>
          {value}
        </span>
        {footer}
      </div>
    </div>
  );
}

// Loading box: kapareho ng "Loading your links..." sa Links page
function OverviewLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]"
    >
      <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Loading system overview...
      </p>
    </div>
  );
}

function AdminError() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/5"
    >
      <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        Couldn&apos;t load the system overview
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        The stats request failed. Refresh the page to try again.
      </p>
    </div>
  );
}

// Data fetching lang ang nasa loob ng Suspense, kaya ang header ay
// nakikita agad habang naglo-load ang stats at table
async function AdminContent() {
  await connection();

  let stats: Awaited<ReturnType<typeof getAdminStats>>;
  try {
    stats = await getAdminStats();
  } catch (error) {
    console.error("[admin] getAdminStats failed:", error);
    return <AdminError />;
  }

  const premiumRate =
    stats.totalUsers > 0 ? (stats.premiumUsers / stats.totalUsers) * 100 : 0;

  const freeUsers = Math.max(0, stats.totalUsers - stats.premiumUsers);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ANALYTICS GRID (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          watermarkColor="text-brand-500"
          iconBoxClass="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300"
          badge={
            <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3 mr-1" /> Live
            </span>
          }
          footer={
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Includes{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {freeUsers.toLocaleString()}
              </strong>{" "}
              free accounts
            </p>
          }
        />

        <StatCard
          title="Premium Profiles"
          value={stats.premiumUsers.toLocaleString()}
          icon={Star}
          iconFill="fill-amber-600 dark:fill-amber-300"
          watermarkColor="text-amber-500"
          iconBoxClass="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300"
          footer={
            <div className="mt-3">
              <div
                className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(premiumRate)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Premium share of all users"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${premiumRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {premiumRate.toFixed(1)}% of all users
              </p>
            </div>
          }
        />

        <StatCard
          title="New Signups (7d)"
          value={stats.newSignups.toLocaleString()}
          icon={UserPlus}
          watermarkColor="text-emerald-500"
          iconBoxClass="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
          badge={
            <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" /> This Week
            </span>
          }
        />

        <StatCard
          title="Global Views (Taps)"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          watermarkColor="text-blue-500"
          iconBoxClass="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300"
        />
      </div>

      {/* Table sits directly on the page background */}
      <div className="pt-2">
        <AdminUserTable users={stats.recentUsers} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* HEADER SECTION (static, lumalabas agad) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage profiles, NFC links, and premium subscriptions across
            KonekTap.
          </p>
        </div>
      </div>

      {/* CONTENT: dito lang ang loading box */}
      <Suspense fallback={<OverviewLoading />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}