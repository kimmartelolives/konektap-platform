import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { redirect } from "next/navigation";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's profile from the database
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Personal Information
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your public identity, contact card details, and custom link.
        </p>
      </div>

      {/* <ProfileForm initialData={profile} /> */}
      <ProfileForm profile={profile} />
    </div>
  );
}