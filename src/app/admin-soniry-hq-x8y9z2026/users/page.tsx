import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdmin } from "../actions";
import { redirect } from "next/navigation";
import { AdvancedUserTable } from "@/components/admin/advanced-user-table";
import { Users, Loader2, AlertTriangle } from "lucide-react";
import { Suspense } from "react";

export const instant = false;

// Loading box: kapareho ng "Loading your links..." sa Links page
function UsersLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]"
    >
      <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Loading all user accounts...
      </p>
    </div>
  );
}

// Data fetching lang ang nasa loob ng Suspense, kaya ang header ay
// nakikita agad habang naglo-load ang table
async function UsersContent() {
  await connection();

  const admin = await verifyAdmin();
  if (!admin) redirect("/dashboard");

  const supabase = await createClient();

  // Kunin ang LAHAT ng users mula sa database
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, tier, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] fetch all users failed:", error);
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/5"
      >
        <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Couldn&apos;t load the user database
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Please check your database connection and refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <AdvancedUserTable users={users || []} />
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      {/* HEADER SECTION (static, lumalabas agad) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-500" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bulk actions, edit profiles, and manage tiers for all registered accounts.
          </p>
        </div>
      </div>

      {/* TABLE SECTION: dito lang ang loading box */}
      <div className="pt-2">
        <Suspense fallback={<UsersLoading />}>
          <UsersContent />
        </Suspense>
      </div>
    </div>
  );
}