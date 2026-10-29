import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortfolioManager } from "@/components/dashboard/portfolio-manager";

export default async function PortfolioPage() {
  await connection();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Kunin ang lahat ng existing portfolio items para maipakita sa listahan
  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

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

      <PortfolioManager initialItems={portfolioItems || []} />
    </div>
  );
}