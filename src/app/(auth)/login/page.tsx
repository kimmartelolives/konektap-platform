import Link from "next/link";
import { Wifi, ArrowRight, AlertCircle } from "lucide-react";
import { login, signInWithGoogle } from "../actions";
import { Suspense } from "react";

async function ErrorAlert({ promise }: { promise: Promise<{ error?: string }> }) {
  const { error } = await promise;
  if (!error) return null;
  return (
    <div className="p-3 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );
}

export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 dark:bg-brand-600/20 rounded-full blur-[130px]" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 mb-4 shadow-lg">
            <Wifi className="rotate-90 text-white w-6 h-6" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to access your dashboard</p>
        </div>

        <Suspense fallback={null}>
          <ErrorAlert promise={props.searchParams} />
        </Suspense>

        {/* Google OAuth Button */}
        <form action={signInWithGoogle}>
          <button type="submit" className="w-full py-3 px-4 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-sm transition flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-50 dark:bg-dark-900 px-2 text-slate-500">Or continue with email</span>
          </div>
        </div>

        {/* Traditional Email Form */}
        <form action={login} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <input name="email" type="email" required className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition" placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <input name="password" type="password" required className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 text-white font-semibold text-sm shadow-lg transition flex items-center justify-center gap-2 mt-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-white/10">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">Create one</Link>
        </div>
      </div>
    </main>
  );
}