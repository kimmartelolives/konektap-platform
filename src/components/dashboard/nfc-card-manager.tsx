"use client";

import { useState, useRef } from "react";
import { 
  Share2, Copy, Check, QrCode, ExternalLink, Download, 
  CreditCard, ShieldCheck, Wrench, Sparkles 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface NfcCardManagerProps {
  profileUrl: string;
  username: string;
  isPublished: boolean;
  isAdmin?: boolean; // Tayo lang ang makakakita kapag true ito
}

export function NfcCardManager({ profileUrl, username, isPublished, isAdmin = false }: NfcCardManagerProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy link.");
    }
  }

  function handleDownloadPNG() {
    if (!qrRef.current) return;

    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const size = 1000;
    const padding = 80;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `konektap-qr-@${username}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  function handleDownloadSVG() {
    if (!qrRef.current) return;

    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `konektap-qr-@${username}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Para sa Client (Share Link & Physical Card Status) */}
        <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Your Smart Card Link</h3>
                  <p className="text-xs text-slate-500">Ready for instant sharing</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Card Linked
              </span>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your physical KonekTap card is automatically synced to this link. Any changes you make to your profile or social links will update on your card in real-time.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Direct Profile URL</label>
              <div className="flex items-center gap-2">
                <input 
                  readOnly 
                  value={profileUrl}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white font-mono outline-none"
                />
                <button 
                  onClick={handleCopy}
                  type="button"
                  className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all shrink-0 flex items-center gap-2 ${
                    copied 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {!isPublished && (
                <p className="text-xs text-rose-500 font-medium mt-2">
                  Note: Your profile is currently unpublished. Enable it in Profile Info so others can view your card.
                </p>
              )}
            </div>

            {/* Upsell Box para umorder pa sila ng extra card o desktop stand sa'yo */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-brand-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Need a replacement or custom desktop stand?</p>
                  <p className="text-[11px] text-slate-500">Order an additional NFC card or QR stand linked to your profile.</p>
                </div>
              </div>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shrink-0 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Order Now
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
              Preview your live digital card <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Digital QR Pass (Pang-scan kapag walang NFC ang kausap nila) */}
        <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-slate-900 dark:text-white" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Digital QR Pass</h3>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Save this QR code to your phone gallery as a backup, or let clients scan it directly from your screen.
          </p>

          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
            <QRCodeSVG 
              ref={qrRef}
              value={profileUrl} 
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#0f172a"}
              level={"H"}
              includeMargin={true}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
            <button
              onClick={handleDownloadPNG}
              type="button"
              className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Save QR to Phone (PNG)
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY SECTION: Ikaw lang ang makakakita nito! */}
      {isAdmin && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Wrench className="w-5 h-5" />
              <h4 className="font-bold text-sm uppercase tracking-wider">KonekTap Admin Manufacturing Tools (Hidden from Clients)</h4>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Use the URI below to write to the client&apos;s NTAG215/NTAG216 chip, or download the vector SVG to extrude the QR code in Bambu Studio / CAD.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadSVG}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download Vector SVG (For 3D Print / Layout)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}