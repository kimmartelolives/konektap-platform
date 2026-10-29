import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AppearanceManager } from "@/components/dashboard/appearance-manager";

async function AppearanceContent() {
  await connection();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <AppearanceManager profile={profile || {}} />;
}

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Appearance
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize how your digital card looks to your clients.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading settings...</p>
        </div>
      }>
        <AppearanceContent />
      </Suspense>
    </div>
  );
}