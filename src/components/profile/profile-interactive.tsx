"use client";

import { useState, useEffect } from "react";
import { Copy, Check, QrCode, X, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { trackLinkClick, trackVcardDownload } from "@/app/[username]/actions";

// 1. Component para sa @username sa ilalim ng pangalan na pwedeng i-copy
export function CopyUsernameBadge({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const url = `${window.location.origin}/@${username}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      title="Click to copy profile link"
      className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-mono text-slate-500 dark:text-slate-400 transition-all active:scale-95 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-white/10"
    >
      <span>@{username}</span>
      {copied ? (
        <span className="inline-flex items-center gap-1 text-emerald-500 font-sans font-semibold text-[11px]">
          <Check className="w-3 h-3" /> Copied!
        </span>
      ) : (
        <Copy className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}

// 2. Component para sa maliit na QR Button sa tabi ng Save to Contacts + Popup Modal
export function ProfileQrModalButton({ username, fullName }: { username: string; fullName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/@${username}` 
    : `https://konektap.com/@${username}`;

  return (
    <>
      {/* Maliit na QR Button sa tabi ng Save to Contacts */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Show QR Code"
        title="Show QR Code"
        className="py-4 px-4 rounded-2xl bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-brand-600 hover:text-white dark:hover:bg-brand-500 transition-all active:scale-[0.98] flex items-center justify-center shrink-0 shadow-md border border-slate-300/50 dark:border-white/10 cursor-pointer"
      >
        <QrCode className="w-5 h-5" />
      </button>

      {/* QR Code Popup Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm p-6 md:p-8 rounded-[2rem] bg-white dark:bg-[#14151a] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {fullName}
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                @{username}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100 inline-block">
              <QRCodeSVG
                value={profileUrl}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"H"}
                includeMargin={true}
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
              Scan this QR code with any phone camera to open this KonekTap profile.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function ProfileThemeOverride({ mode }: { mode: string }) {
  useEffect(() => {
    const html = document.documentElement;
    
    if (!mode || mode === "system") {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      html.removeAttribute("data-theme");
      return;
    }

    html.classList.remove("light", "dark");
    html.classList.add(mode);
    html.style.colorScheme = mode;
    html.setAttribute("data-theme", mode);
  }, [mode]);

  return null;
}

export function TrackedVcardButton({ username, className }: { username: string, className: string }) {
  return (
    <a 
      href={`/api/vcard/${username}`} 
      download={`${username}.vcf`} // Force browser to directly download the file
      onClick={() => {
        // Gumamit tayo ng fire-and-forget para hindi ma-block ng tracking ang download process
        trackVcardDownload(username).catch(console.error);
      }}
      className={className}
    >
      <UserPlus className="w-4 h-4" />
      Save to Contacts
    </a>
  );
}

export function TrackedSocialLink({ link, className, children }: { link: any, className: string, children: React.ReactNode }) {
  return (
    <a 
      href={link.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      onClick={() => {
        trackLinkClick(link.id).catch(console.error);
      }}
      className={className}
    >
      {children}
    </a>
  );
}