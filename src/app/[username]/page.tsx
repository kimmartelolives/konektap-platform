import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  Phone, Mail, CheckCircle2, ShieldCheck, ArrowUpRight, Loader2, Globe
} from "lucide-react";
import {
  FaFacebook, FaInstagram, FaGithub, FaLinkedin, FaXTwitter, FaYoutube
} from "react-icons/fa6";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  CopyUsernameBadge,
  ProfileQrModalButton,
  ProfileThemeOverride,
  TrackedVcardButton,
  TrackedSocialLink
} from "@/components/profile/profile-interactive";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
import { ProfileTracker } from "@/components/profile/profile-tracker";
import PublicLeadAndContact from "@/components/profile/PublicLeadAndContact";
import { BusinessHubDisplay } from "@/components/profile/business-hub-display";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  facebook: FaFacebook,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  github: FaGithub,
  twitter: FaXTwitter,
  youtube: FaYoutube,
};

const THEME_BANNERS: Record<string, string> = {
  default: "bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-500",
  executive: "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 border border-slate-200",
  corporate: "bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 border border-slate-700",
  luxe: "bg-gradient-to-br from-amber-600 via-yellow-700 to-stone-900",
  emerald: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700",
  midnight: "bg-gradient-to-br from-slate-950 via-slate-800 to-zinc-900",
  rose: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-600",
  cyber: "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600",
  amethyst: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600",
};

// Extra accents drawn on top of the banner gradient
const THEME_BANNER_ACCENTS: Record<string, { glow: string; line: string }> = {
  midnight: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.35),transparent_60%)]",
    line: "via-amber-400/60",
  },
  corporate: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_60%)]",
    line: "via-indigo-500/50",
  },
  luxe: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.3),transparent_60%)]",
    line: "via-amber-500/50",
  },
};

const THEME_BUTTONS: Record<string, string> = {
  default: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 shadow-brand-500/25",
  executive: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/25",
  corporate: "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900/25 border border-slate-700",
  luxe: "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/25",
  midnight: "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-amber-500/25",
  rose: "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/25",
  cyber: "bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-cyan-500/25",
  amethyst: "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/25",
};

// Accent color for the profession line
const THEME_TEXT: Record<string, { base: string; glass: string }> = {
  default: { base: "text-brand-600 dark:text-accent-400", glass: "text-accent-400" },
  executive: { base: "text-indigo-600 dark:text-indigo-400", glass: "text-indigo-300" },
  corporate: { base: "text-slate-700 dark:text-slate-300", glass: "text-slate-300" },
  luxe: { base: "text-amber-600 dark:text-amber-400", glass: "text-amber-300" },
  emerald: { base: "text-emerald-600 dark:text-emerald-400", glass: "text-emerald-400" },
  midnight: { base: "text-amber-600 dark:text-amber-400", glass: "text-amber-400" },
  rose: { base: "text-rose-600 dark:text-rose-400", glass: "text-rose-400" },
  cyber: { base: "text-cyan-600 dark:text-cyan-400", glass: "text-cyan-400" },
  amethyst: { base: "text-violet-600 dark:text-violet-400", glass: "text-violet-400" },
};

const THEME_GLOWS: Record<string, string> = {
  default: "bg-gradient-to-br from-brand-500 via-indigo-500 to-accent-500",
  executive: "bg-gradient-to-br from-blue-400 via-indigo-500 to-slate-400",
  corporate: "bg-gradient-to-br from-slate-700 via-indigo-900 to-slate-950",
  luxe: "bg-gradient-to-br from-amber-500 via-yellow-600 to-stone-900",
  emerald: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500",
  midnight: "bg-gradient-to-br from-amber-500 via-indigo-600 to-purple-700",
  rose: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-500",
  cyber: "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500",
  amethyst: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500",
};

// Font + shape maps live here so the public page does not depend on Tailwind config
const FONT_FAMILIES: Record<string, string> = {
  "font-sans": "ui-sans-serif, system-ui, -apple-system, sans-serif",
  "font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  "font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  "font-display": "'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, sans-serif",
  "font-futura": "Futura, 'Futura PT', 'Jost', 'Century Gothic', 'Trebuchet MS', sans-serif",
  "font-editorial": "Futura, 'Futura PT', 'Jost', 'Century Gothic', 'Trebuchet MS', sans-serif", // legacy saved value
};
const PRO_FONTS = ["font-futura", "font-editorial"];

const SHAPES: Record<string, string> = {
  "rounded-full": "rounded-full",
  "rounded-2xl": "rounded-2xl",
  "rounded-lg": "rounded-lg",
  "rounded-none": "rounded-none",
  "rounded-[32px]": "rounded-[32px]",
};

/* ---------------- Helpers ---------------- */

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function mailHref(email: string): string {
  return `mailto:${encodeURIComponent(email.trim()).replace(/%40/g, "@")}`;
}

async function ProfileContent({ paramsPromise }: { paramsPromise: Promise<{ username: string }> }) {
  await connection();

  const { username } = await paramsPromise;
  const decodedParam = safeDecode(username);
  if (decodedParam === null) notFound();

  if (!decodedParam.startsWith("@")) {
    redirect(`/@${encodeURIComponent(decodedParam)}`);
  }

  const cleanUsername = decodedParam.slice(1);
  if (!cleanUsername) notFound();

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (!profile || !profile.is_published) {
    notFound();
  }

  const [{ data: links }, { data: portfolioItems }, { data: services }] = await Promise.all([
    supabase
      .from("social_links")
      .select("*")
      .eq("user_id", profile.id)
      .order("position", { ascending: true }),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("services")
      .select("id, title, price, description, position")
      .eq("user_id", profile.id)
      .order("position", { ascending: true }),
  ]);

  const safeLinks = (links ?? []).filter(
    (link) => typeof link.url === "string" && isSafeHttpUrl(link.url)
  );

  const shapeClass = SHAPES[String(profile.button_shape)] ?? "rounded-2xl";
  const themeId: string = profile.theme in THEME_BANNERS ? profile.theme : "default";

  const tier: string = profile.tier || "demo";

  const requestedFont: string = profile.font_style || "font-sans";
  const fontFamily =
    PRO_FONTS.includes(requestedFont) && tier !== "premium"
      ? FONT_FAMILIES["font-sans"]
      : FONT_FAMILIES[requestedFont] ?? FONT_FAMILIES["font-sans"];
  // keep the display look on the default font only, so other font choices apply to the name too
  const headingFontClass = requestedFont === "font-sans" ? "font-display" : "";
  const canCaptureLeads =
    (tier === "standard" || tier === "premium") && (profile.show_lead_form ?? true);
  const hasContactDetails = !!(profile.phone_public || profile.email_public || canCaptureLeads);

  // Color Modes (Glass o Business Glass / Enterprise Minimal)
  const isGlassMode = profile.color_mode === "glass" && tier === "premium";
  const isEnterpriseGlass = profile.color_mode === "business-glass" && tier === "premium";

  const effectiveColorMode = isGlassMode
    ? "dark"
    : isEnterpriseGlass
    ? "light"
    : profile.color_mode === "glass" || profile.color_mode === "business-glass"
    ? "system"
    : profile.color_mode;

  /* ---------------- Surface styles ---------------- */

  let cardSurfaceClass = "glass-card bg-white/70 dark:bg-dark-900/70 backdrop-blur-2xl shadow-2xl border border-white/50 dark:border-white/10 text-slate-900 dark:text-white";
  if (isEnterpriseGlass) {
    cardSurfaceClass = "bg-white/70 backdrop-blur-xl border border-slate-200/70 ring-1 ring-white/70 text-slate-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]";
  } else if (isGlassMode) {
    cardSurfaceClass = "bg-gradient-to-b from-slate-900/90 via-indigo-950/90 to-slate-950/95 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 text-white shadow-2xl";
  }

  const avatarBorderClass = isGlassMode
    ? "border-slate-900"
    : "border-white dark:border-[#14151a]";

  const professionClass = isGlassMode
    ? (THEME_TEXT[themeId] ?? THEME_TEXT.default).glass
    : (THEME_TEXT[themeId] ?? THEME_TEXT.default).base;

  const contactTileClass = isGlassMode
    ? "bg-white/10 border-white/15 text-white"
    : "bg-white/80 dark:bg-dark-950/60 border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white";

  const phoneIconClass = isGlassMode
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

  const mailIconClass = isGlassMode
    ? "bg-brand-500/10 text-brand-300"
    : "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400";

  const linkCardClass = isGlassMode
    ? "bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/30 hover:shadow-xl hover:shadow-black/30"
    : "bg-white dark:bg-dark-900 border-slate-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10";

  const linkIconBoxClass = isGlassMode
    ? "bg-white/10 text-slate-200"
    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";

  const linkTitleClass = isGlassMode ? "text-white" : "text-slate-900 dark:text-white";
  const linkSubClass = isGlassMode ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  const linkArrowClass = isGlassMode
    ? "text-slate-500 group-hover:text-white"
    : "text-slate-300 dark:text-slate-600 group-hover:text-brand-500";

  const dividerClass = isGlassMode ? "bg-white/10" : "bg-slate-200 dark:bg-white/10";
  const sectionHeadingClass = isGlassMode ? "text-slate-400" : "text-slate-400 dark:text-slate-500";
  const footerBorderClass = isGlassMode ? "border-white/10" : "border-slate-200/60 dark:border-white/5";
  const footerTextClass = isGlassMode ? "text-slate-400" : "text-slate-500";
  const footerPillClass = isGlassMode
    ? "bg-white/10 text-slate-300 hover:text-white hover:bg-white/15"
    : "bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10";

  const bannerAccent = THEME_BANNER_ACCENTS[themeId];
  const primaryButtonClass = isEnterpriseGlass
    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
    : THEME_BUTTONS[themeId] || THEME_BUTTONS.default;
  const isDemo = tier === "demo";

  const verifiedBadge = (
    <div className="absolute top-4 right-4 z-10 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-white flex items-center gap-1.5 border border-white/20 shadow-sm">
      <ShieldCheck className="w-3.5 h-3.5 text-accent-300" />
      <span>{isDemo ? "KonekTap Demo" : "KonekTap Verified"}</span>
    </div>
  );

  return (
    <main
      style={{ fontFamily }}
      className={`min-h-screen relative selection:bg-brand-500/30 ${
        isGlassMode ? "dark" : ""
      }`}
    >
      <ProfileThemeOverride mode={effectiveColorMode} />
      <ProfileTracker username={profile.username} />

      {/* Fixed background layer: stays put while the page scrolls.
          Using `fixed` + overflow-hidden so the blurred blobs never move or cause horizontal scroll. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${
          isGlassMode
            ? "bg-slate-950"
            : isEnterpriseGlass
            ? "bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100"
            : "bg-slate-50 dark:bg-dark-950"
        }`}
      >
        {/* Soft shapes behind the frosted card so the blur is visible */}
        {isEnterpriseGlass && (
          <>
            <div className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-blue-900/15 blur-[120px]" />
            <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-slate-500/20 blur-[120px]" />
          </>
        )}

        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-brand-500/10 via-brand-500/5 to-transparent" />

        {/* Background glow in Glass (midnight) mode */}
        {isGlassMode && (
          <div
            className={`absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-40 blur-[120px] ${
              THEME_GLOWS[themeId] ?? THEME_GLOWS.default
            }`}
          />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* LEFT COLUMN: Sticky Profile Card */}
          <div className="w-full lg:w-[420px] shrink-0 lg:sticky lg:top-8">
            <div className={`${cardSurfaceClass} overflow-hidden flex flex-col ${shapeClass === "rounded-none" ? "rounded-none" : "rounded-[2.5rem]"}`}>

              {profile.banner_url ? (
                <div className="w-full aspect-[21/9] relative bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.banner_url} alt="" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  {verifiedBadge}
                </div>
              ) : (
                <div className={`w-full aspect-[21/9] relative overflow-hidden ${THEME_BANNERS[themeId] || THEME_BANNERS.default}`}>
                  {bannerAccent && (
                    <>
                      <div className={`absolute inset-0 ${bannerAccent.glow}`} />
                      <div
                        className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent ${bannerAccent.line}`}
                      />
                    </>
                  )}
                  {verifiedBadge}
                </div>
              )}

              <div className="px-6 sm:px-8 pb-8 flex-1 relative flex flex-col items-center text-center">
                <div className="absolute -top-14">
                  <div className="relative group">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || "Profile photo"}
                        className={`w-28 h-28 object-cover border-[5px] ${avatarBorderClass} shadow-xl rotate-0 group-hover:rotate-3 transition-transform duration-300 bg-white ${shapeClass}`}
                      />
                    ) : (
                      <div className={`w-28 h-28 bg-slate-100 dark:bg-slate-800 border-[5px] ${avatarBorderClass} shadow-xl flex items-center justify-center text-4xl ${headingFontClass} font-bold text-slate-400 uppercase rotate-0 group-hover:rotate-3 transition-transform duration-300 ${shapeClass}`}>
                        {profile.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-4 ${avatarBorderClass} flex items-center justify-center text-white shadow-md`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                <div className="pt-16 w-full flex flex-col items-center">
                  <h1 className={`${headingFontClass} font-bold text-2xl md:text-3xl tracking-tight`}>
                    {profile.full_name}
                  </h1>
                  <CopyUsernameBadge username={profile.username} />
                  {profile.profession && (
                    <p className={`text-sm font-semibold mt-2 ${professionClass}`}>
                      {profile.profession}
                    </p>
                  )}
                  {profile.bio && (
                    <div className="mt-4 pt-4 border-t border-slate-200/20 dark:border-white/10 w-full">
                      <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 ${isGlassMode ? "text-slate-300" : "text-slate-600 dark:text-slate-400"}`}>
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Primary Action: Save to Contacts + QR */}
                  <div className="mt-6 w-full flex items-center gap-2.5">
                    <TrackedVcardButton
                      username={profile.username}
                      className={`flex-1 py-3.5 px-5 font-semibold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${shapeClass} ${primaryButtonClass}`}
                    />
                    <ProfileQrModalButton username={profile.username} fullName={profile.full_name} />
                  </div>

                  {/* Direct Contact Info & Inquire Trigger */}
                  {hasContactDetails && (
                    <div className="mt-5 pt-5 border-t border-slate-200/20 dark:border-white/10 w-full space-y-2.5 text-left">
                      {profile.phone_public && (
                        <a
                          href={telHref(profile.phone_public)}
                          className={`group p-3 ${contactTileClass} border hover:border-brand-400 transition-all flex items-center justify-between ${shapeClass}`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-9 h-9 ${phoneIconClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${shapeClass}`}>
                              <Phone className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
                                Mobile Phone
                              </p>
                              <p className="text-xs sm:text-sm font-semibold truncate">
                                {profile.phone_public}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                        </a>
                      )}

                      {profile.email_public && (
                        <a
                          href={mailHref(profile.email_public)}
                          className={`group p-3 ${contactTileClass} border hover:border-brand-400 transition-all flex items-center justify-between ${shapeClass}`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-9 h-9 ${mailIconClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${shapeClass}`}>
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
                                Email Address
                              </p>
                              <p className="text-xs sm:text-sm font-semibold truncate">
                                {profile.email_public}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                        </a>
                      )}

                      {/* Share Your Contact Info (lead capture) */}
                      {canCaptureLeads && (
                        <div className="pt-1">
                          <PublicLeadAndContact
                            profileId={profile.id}
                            username={profile.username}
                            publicPhone={null}
                            publicEmail={null}
                            showLeadForm={profile.show_lead_form ?? true}
                            userTier={profile.tier || "demo"}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Business Hub -> Featured Portfolio -> Social & Web Links */}
          <div className="flex-1 w-full flex flex-col gap-8 lg:pt-2">

            {/* 1. Business Hub */}
            <BusinessHubDisplay profile={profile} services={services || []} />

            {/* 2. Featured Portfolio */}
            <PortfolioGallery items={portfolioItems || []} tier={profile.tier} />

            {/* 3. Social & Web Links */}
            {safeLinks.length > 0 && (
              <section className="mt-2">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-px flex-1 ${dividerClass}`}></div>
                  <h2 className={`text-xs font-bold uppercase tracking-widest ${sectionHeadingClass}`}>
                    Social & Web Links
                  </h2>
                  <div className={`h-px flex-1 ${dividerClass}`}></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  {safeLinks.map((link) => {
                    const Icon = PLATFORM_ICONS[link.platform] || Globe;

                    return (
                      <TrackedSocialLink
                        key={link.id}
                        link={link}
                        className={`group p-1 border shadow-sm transition-all block ${linkCardClass} ${shapeClass}`}
                      >
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className={`w-12 h-12 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ${linkIconBoxClass} ${shapeClass}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <p className={`text-sm md:text-base font-semibold truncate ${linkTitleClass}`}>
                                {link.title}
                              </p>
                              <p className={`text-[10px] md:text-xs truncate uppercase tracking-wider mt-0.5 ${linkSubClass}`}>
                                {link.platform}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className={`w-5 h-5 transition-colors shrink-0 ml-2 ${linkArrowClass}`} />
                        </div>
                      </TrackedSocialLink>
                    );
                  })}
                </div>
              </section>
            )}

            <div className={`mt-12 pt-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4 border-t ${footerBorderClass}`}>
              <p className={`text-xs font-medium ${footerTextClass}`}>
                &copy; {new Date().getFullYear()} {profile.full_name || profile.username}.
              </p>
              <Link
                href="/"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold transition-colors uppercase tracking-widest ${footerPillClass}`}
              >
                <ShieldCheck className="w-3 h-3" />
                KonekTap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={
      <main className="min-h-screen relative bg-slate-50 dark:bg-dark-950 flex flex-col items-center justify-center z-10">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading profile...</p>
      </main>
    }>
      <ProfileContent paramsPromise={props.params} />
    </Suspense>
  );
}