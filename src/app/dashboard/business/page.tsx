import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import TierGate, { AccountTier } from "@/components/dashboard/TierGate";
import { BusinessHubManager } from "@/components/dashboard/business-hub-manager";

async function BusinessHubContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "tier, location_address, map_embed_url, booking_enabled, booking_url, catalog_title, catalog_pdf_url"
    )
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier as AccountTier) || "demo";

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <TierGate
      userTier={userTier}
      requiredTier="premium"
      featureName="Business Hub & Pro Tools"
      description="Showcase your services and pricing, embed an interactive Google Map, accept appointment bookings, and share a downloadable PDF catalog or menu with the Premium plan."
    >
      <BusinessHubManager
        initialServices={services || []}
        profile={profile || {}}
      />
    </TierGate>
  );
}

export default function BusinessHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Business Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your services, interactive location map, appointment booking, and PDF catalog.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <p className="text-sm text-slate-500 font-medium animate-pulse">
              Loading Business Hub...
            </p>
          </div>
        }
      >
        <BusinessHubContent />
      </Suspense>
    </div>
  );
}