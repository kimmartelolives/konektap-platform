import { Navbar } from "@/components/layout/navbar";

export default function HomePage() {
  return (
    <>
      {/* Ambient Glow Orbs from HTML Reference (Adapted for Light/Dark) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/10 dark:bg-brand-600/20 rounded-full blur-[130px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-accent-500/10 dark:bg-accent-500/15 rounded-full blur-[140px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[140px]"></div>
      </div>

      <Navbar />

      <main className="relative z-10 min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-100 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 dark:bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500 dark:bg-accent-400"></span>
            </span>
            <span>One Unified Link • Instant Contact Save • Zero Apps Required</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Share Everything With a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-500 to-accent-500 dark:from-brand-400 dark:via-indigo-300 dark:to-accent-400">Single Tap.</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            Ditch outdated paper cards. Every EZTap smart card connects directly to your personalized hub.
          </p>
        </div>
      </main>
    </>
  );
}