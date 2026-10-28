import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LinksManager } from "@/components/dashboard/links-manager";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// 1. We move the database fetch into its own async component
async function LinksContent() {
  // It is completely safe to call connection() here because it is inside Suspense
  await connection(); 

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's links, ordered by their custom dragged position
  const { data: links } = await supabase
    .from("social_links")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  return <LinksManager initialLinks={links || []} />;
}

// 2. Main Page - Renders instantly and streams the links via Suspense
export default function LinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Social & Custom Links
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add your portfolios, social media, and websites. Drag to reorder them on your public profile.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading your links...</p>
        </div>
      }>
        <LinksContent />
      </Suspense>
    </div>
  );
}