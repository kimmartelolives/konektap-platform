export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060911] text-slate-50 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-xl w-full rounded-3xl bg-slate-900/80 border border-white/10 p-8 shadow-2xl text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Phase 1 • Environment Initialized
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          EZ<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Tap</span> Platform
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          One Tap. One Identity. Everything Connected. Your Next.js + TypeScript +
          Tailwind CSS foundation is running locally and ready for Phase 2.
        </p>

        <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-xs font-mono text-slate-400">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="block text-emerald-400 font-semibold">Next.js</span>
            App Router
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="block text-cyan-400 font-semibold">TypeScript</span>
            Strict Mode
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="block text-indigo-400 font-semibold">Tailwind</span>
            Configured
          </div>
        </div>
      </div>
    </main>
  );
}