"use client";

import { useState } from "react";
import Link from "next/link";
// 1. Idinagdag ang 'Inbox' dito sa import:
import { Menu, X, Wifi, User, Link as LinkIcon, Image, Palette, CreditCard, BarChart, LogOut, Lock, Inbox, Briefcase } from "lucide-react";
import { AccountTier, TIER_CONFIG, hasTierAccess } from "./TierGate";

interface MobileNavProps {
  userEmail?: string;
  userTier?: AccountTier;
}

export default function MobileNav({ userEmail, userTier = "demo" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

const navLinks: Array<{ name: string; href: string; icon: any; minTier?: AccountTier }> = [
    { name: "Overview", href: "/dashboard", icon: BarChart },
    { name: "Profile Info", href: "/dashboard/profile", icon: User },
    { name: "Social Links", href: "/dashboard/links", icon: LinkIcon },
    { name: "Portfolio", href: "/dashboard/portfolio", icon: Image, minTier: "standard" },
    { name: "Leads", href: "/dashboard/leads", icon: Inbox, minTier: "standard" },
    { name: "Business Hub", href: "/dashboard/business", icon: Briefcase, minTier: "premium" },
    { name: "Appearance", href: "/dashboard/appearance", icon: Palette, minTier: "standard" },
    { name: "NFC Cards", href: "/dashboard/nfc-cards", icon: CreditCard, minTier: "standard" },
  ];

  const badge = TIER_CONFIG[userTier];

  return (
    <div className="md:hidden w-full bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-md">
            <Wifi className="rotate-90 text-white w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-base text-slate-900 dark:text-white">KonekTap</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
            {badge.label}
          </span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Dropdown Menu when Hamburger is Clicked */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/10 shadow-xl py-4 px-4 space-y-3">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isLocked = link.minTier ? !hasTierAccess(userTier, link.minTier) : false;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>{link.name}</span>
                  </div>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
            {userEmail && (
              <div className="flex items-center justify-between px-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {userEmail}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
                  {badge.label}
                </span>
              </div>
            )}
            <form action="/auth/logout" method="POST">
              <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}