import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Eye, Link as LinkIcon, Download, MousePointerClick, ArrowUpRight, TrendingUp, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// 1. Ilipat ang buong logic sa async component na ito
async function DashboardContent() {
  await connection();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch Profile Stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, views, vcard_downloads, full_name")
    .eq("id", user.id)
    .single();

  // Fetch all Social Links to calculate total clicks and top link
  const { data: links } = await supabase
    .from("social_links")
    .select("*")
    .eq("user_id", user.id)
    .order("clicks", { ascending: false });

  // Calculations
  const totalClicks = links?.reduce((sum, link) => sum + (link.clicks || 0), 0) || 0;
  const topLink = links && links.length > 0 && links[0].clicks > 0 ? links[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "User"}! 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here are your real-time KonekTap analytics.
          </p>
        </div>
        <a 
          href={`/@${profile?.username}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-sm hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
        >
          View Live Card <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>

      {/* ANALYTICS GRID (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Total Views */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              <TrendingUp className="w-3 h-3 mr-1" /> Live
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-1">Profile Views</h3>
            <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
              {profile?.views?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Card 2: Contact Saves */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-1">Contact Saves</h3>
            <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
              {profile?.vcard_downloads?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Card 3: Link Clicks */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-1">Total Link Clicks</h3>
            <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
              {totalClicks.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Top Performing Link */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Trophy className="w-32 h-32" />
          </div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm text-yellow-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-sm text-slate-300 mb-1">Top Performing Link</h3>
            <span className="text-xl font-bold truncate block">
              {topLink ? topLink.title : "No clicks yet"}
            </span>
            {topLink && (
              <p className="text-xs text-brand-300 mt-1 font-medium">{topLink.clicks} clicks</p>
            )}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/profile" className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-900 flex flex-col items-center justify-center text-center gap-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">👤</div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Edit Profile</span>
          </Link>
          <Link href="/dashboard/links" className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-900 flex flex-col items-center justify-center text-center gap-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">🔗</div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Manage Links</span>
          </Link>
          <Link href="/dashboard/portfolio" className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-900 flex flex-col items-center justify-center text-center gap-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">🖼️</div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Add Portfolio</span>
          </Link>
          <Link href="/dashboard/appearance" className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-900 flex flex-col items-center justify-center text-center gap-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">🎨</div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Change Theme</span>
          </Link>
        </div>
      </div>

    </div>
  );
}

// 2. Ang Root Page na nakabalot sa Suspense
export default function DashboardOverview() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading analytics...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}