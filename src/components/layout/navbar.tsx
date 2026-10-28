"use client";

import * as React from "react";
import Link from "next/link";
import { Wifi, Menu, X, ArrowRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition">
            <Wifi className="rotate-90 text-white w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-400 border-2 border-slate-100 dark:border-dark-900"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                EZ<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-500 dark:from-brand-400 dark:to-accent-400">Tap</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                NFC 2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono -mt-1">
              eztap.com
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="#customizer" className="hover:text-brand-600 dark:hover:text-white transition flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            Live Customizer
          </Link>
          <Link href="#industries" className="hover:text-brand-600 dark:hover:text-white transition">Who It&apos;s For</Link>
          <Link href="#features" className="hover:text-brand-600 dark:hover:text-white transition">Why EZTap</Link>
        </nav>

        {/* Desktop CTA Buttons & Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link 
            href="#order-form" 
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 shadow-lg shadow-brand-500/25 transition flex items-center gap-2"
          >
            <span>Get Your Card</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Controls */}
        <div className="flex md:hidden items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-dark-900/95 px-4 pt-3 pb-6 space-y-3 shadow-xl backdrop-blur-xl">
          <Link href="#customizer" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5">
            Live Profile Customizer
          </Link>
          <Link href="#industries" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5">
            Who It&apos;s For (Industries)
          </Link>
          <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5">
            Features & Scope
          </Link>
          <Link href="#order-form" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center py-3 mt-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-500 shadow-lg">
            Get Your Card Now
          </Link>
        </div>
      )}
    </header>
  );
}