import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PortfolioManager } from "@/components/dashboard/portfolio-manager";
import TierGate, { AccountTier } from "@/components/dashboard/TierGate";

async function PortfolioContent() {
  await connection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get the user's tier along with their portfolio items
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier as AccountTier) || "demo";

  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <TierGate
      userTier={userTier}
      requiredTier="standard"
      featureName="Portfolio & Work Gallery"
      description="Building a portfolio gallery and showcasing your work on your public card is available for Standard and Premium accounts."
    >
      <PortfolioManager initialItems={portfolioItems || []} />
    </TierGate>
  );
}

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Portfolio
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add items to your gallery to show up on your KonekTap public card.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading portfolio...</p>
        </div>
      }>
        <PortfolioContent />
      </Suspense>
    </div>
  );
}