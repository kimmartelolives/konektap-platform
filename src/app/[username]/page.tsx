import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { 
  UserPlus, Phone, Mail, CheckCircle2, ShieldCheck, ArrowUpRight, Loader2,
  Globe, Camera, Code, Briefcase, MessageCircle, PlaySquare, ThumbsUp 
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CopyUsernameBadge, ProfileQrModalButton } from "@/components/profile/profile-interactive";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  facebook: ThumbsUp,
  instagram: Camera,
  linkedin: Briefcase,
  github: Code,
  twitter: MessageCircle,
  youtube: PlaySquare,
};

async function ProfileContent({ paramsPromise }: { paramsPromise: Promise<{ username: string }> }) {
  await connection(); 

  const params = await paramsPromise;
  const decodedParam = decodeURIComponent(params.username);

  if (!decodedParam.startsWith("@")) {
    redirect(`/@${decodedParam}`);
  }

  const cleanUsername = decodedParam.slice(1);
  const supabase = await createClient();

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", cleanUsername)
    .single();

  if (!profile || !profile.is_published) {
    notFound(); 
  }

  // 2. Fetch Social Links
  const { data: links } = await supabase
    .from("social_links")
    .select("*")
    .eq("user_id", profile.id)
    .order("position", { ascending: true });

  // 3. Fetch Portfolio Items (Bagong Dagdag!)
  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", profile.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-20 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Sticky Profile Card */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="lg:sticky lg:top-10 glass-card bg-white/70 dark:bg-dark-900/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col">
            
            <div className="h-36 md:h-44 bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-500 relative">
              <div className="absolute top-5 right-5 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-mono text-white flex items-center gap-1.5 border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-300" />
                <span>KonekTap Verified</span>
              </div>
            </div>

            <div className="px-8 pb-10 flex-1 relative flex flex-col items-center text-center">
              <div className="absolute -top-16">
                <div className="relative group">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name}
                      className="w-32 h-32 rounded-[2rem] object-cover border-[6px] border-white dark:border-[#14151a] shadow-xl rotate-0 group-hover:rotate-3 transition-transform duration-300 bg-white"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-[2rem] bg-slate-100 dark:bg-slate-800 object-cover border-[6px] border-white dark:border-[#14151a] shadow-xl flex items-center justify-center text-5xl font-display font-bold text-slate-400 uppercase rotate-0 group-hover:rotate-3 transition-transform duration-300">
                      {profile.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white dark:border-[#14151a] flex items-center justify-center text-white shadow-md">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
              </div>

              <div className="pt-20 w-full flex flex-col items-center">
                <h1 className="font-display font-bold text-3xl md:text-4xl text-slate-900 dark:text-white tracking-tight">
                  {profile.full_name}
                </h1>

                <CopyUsernameBadge username={profile.username} />

                {profile.profession && (
                  <p className="text-sm md:text-base font-semibold text-brand-600 dark:text-accent-400 mt-3">
                    {profile.profession}
                  </p>
                )}
                
                {profile.bio && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="mt-8 w-full flex items-center gap-3">
                  <a 
                    href={`/api/vcard/${profile.username}`} 
                    className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-xl hover:shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Save to Contacts
                  </a>
                  <ProfileQrModalButton username={profile.username} fullName={profile.full_name} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Grid, Social Links, & Portfolio */}
        <div className="flex-1 flex flex-col gap-8 lg:pt-6">
          
          <section>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contact Information</h2>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {profile.phone_public && (
                <a href={`tel:${profile.phone_public.replace(/\s+/g, '')}`} className="group p-1 rounded-[1.5rem] bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all block">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mobile Phone</p>
                        <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">{profile.phone_public}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
                  </div>
                </a>
              )}
              
              {profile.email_public && (
                <a href={`mailto:${profile.email_public}`} className="group p-1 rounded-[1.5rem] bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all block">
                  <div className="p-5 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email Address</p>
                        <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white truncate">{profile.email_public}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                  </div>
                </a>
              )}
            </div>
          </section>

          {links && links.length > 0 && (
            <section className="mt-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Social & Web Links</h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                {links.map((link) => {
                  const Icon = PLATFORM_ICONS[link.platform] || Globe;
                  
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="group p-1 rounded-[1.5rem] bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all block">
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-white truncate">{link.title}</p>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider mt-0.5">{link.platform}</p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {/* PORTFOLIO SECTION MOUNTED HERE */}
          <PortfolioGallery items={portfolioItems || []} />
          
          <div className="mt-12 pt-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-medium">
              &copy; 2026 {profile.full_name}.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 dark:bg-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              KonekTap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-dark-950 relative selection:bg-brand-500/30 font-sans">
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-brand-500/10 via-brand-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] pointer-events-none hidden md:block" />
      <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[150px] pointer-events-none hidden lg:block" />

      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] relative z-10">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading profile...</p>
        </div>
      }>
        <ProfileContent paramsPromise={props.params} />
      </Suspense>
    </main>
  );
}