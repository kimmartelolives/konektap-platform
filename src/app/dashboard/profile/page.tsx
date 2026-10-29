import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

async function ProfileContent() {
  await connection(); 

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the existing profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <ProfileForm profile={profile || {}} />;
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Profile Information
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your public link and update your contact details.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading profile data...</p>
        </div>
      }>
        <ProfileContent />
      </Suspense>
    </div>
  );
}