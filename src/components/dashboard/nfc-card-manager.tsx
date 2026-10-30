"use client";

import { useState, useRef, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Download,
  CreditCard,
  ShieldCheck,
  Wrench,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface NfcCardManagerProps {
  profileUrl: string;
  username: string;
  isPublished: boolean;
  isAdmin?: boolean; // UI-only flag: always enforce admin checks on the server too
}

type Message = { type: "error" | "success"; text: string };
type CopyKey = "url" | "admin";
type BusyKey = "png" | "svg";

// TODO: palitan ng actual order page / Messenger link ng KonekTap
const ORDER_URL = "https://facebook.com";
const QR_EXPORT_SIZE = 1000;
const QR_EXPORT_PADDING = 80;
const COPIED_RESET_MS = 2000;

const URL_INPUT_CLASS =
  "flex-1 min-w-0 px-4 py-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white font-mono outline-none transition-colors";

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load QR image."));
    img.src = src;
  });
}

export function NfcCardManager({
  profileUrl,
  username,
  isPublished,
  isAdmin = false,
}: NfcCardManagerProps) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [busy, setBusy] = useState<BusyKey | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const qrRef = useRef<SVGSVGElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const adminInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release the "Copied!" timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Auto-dismiss feedback (errors stay a bit longer)
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(
      () => setMessage(null),
      message.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [message]);

  async function handleCopy(key: CopyKey) {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), COPIED_RESET_MS);
    } catch (err) {
      console.error("Copy error:", err);
      // Fallback: select the text so the user can copy it manually
      const input = key === "url" ? urlInputRef.current : adminInputRef.current;
      input?.focus();
      input?.select();
      setMessage({
        type: "error",
        text: "Couldn't copy automatically. The link is selected, press Ctrl/Cmd + C to copy it.",
      });
    }
  }

  async function handleDownloadPNG() {
    if (!qrRef.current || busy) return;
    setBusy("png");
    setMessage(null);

    let svgUrl: string | null = null;
    try {
      const svgData = new XMLSerializer().serializeToString(qrRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      svgUrl = URL.createObjectURL(svgBlob);

      const img = await loadImage(svgUrl);

      const canvas = document.createElement("canvas");
      canvas.width = QR_EXPORT_SIZE;
      canvas.height = QR_EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, QR_EXPORT_SIZE, QR_EXPORT_SIZE);
      ctx.drawImage(
        img,
        QR_EXPORT_PADDING,
        QR_EXPORT_PADDING,
        QR_EXPORT_SIZE - QR_EXPORT_PADDING * 2,
        QR_EXPORT_SIZE - QR_EXPORT_PADDING * 2
      );

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) throw new Error("Failed to create PNG.");

      const pngUrl = URL.createObjectURL(pngBlob);
      triggerDownload(pngUrl, `konektap-qr-@${username}.png`);
      URL.revokeObjectURL(pngUrl);

      setMessage({ type: "success", text: "QR code saved as PNG!" });
    } catch (err) {
      console.error("PNG download error:", err);
      setMessage({
        type: "error",
        text: "Failed to generate the QR image. Please try again.",
      });
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setBusy(null);
    }
  }

  function handleDownloadSVG() {
    if (!qrRef.current || busy) return;
    setBusy("svg");
    setMessage(null);

    let svgUrl: string | null = null;
    try {
      const svgData = new XMLSerializer().serializeToString(qrRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      svgUrl = URL.createObjectURL(svgBlob);
      triggerDownload(svgUrl, `konektap-qr-@${username}.svg`);
      setMessage({ type: "success", text: "Vector SVG downloaded." });
    } catch (err) {
      console.error("SVG download error:", err);
      setMessage({
        type: "error",
        text: "Failed to export the SVG. Please try again.",
      });
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Sticky so feedback is visible no matter where the user is on the page */}
      {message && (
        <div className="sticky top-4 z-30">
          <div className="rounded-xl bg-white dark:bg-dark-900 shadow-lg">
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 border ${
                message.type === "error"
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
              }`}
            >
              {message.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Share link & physical card status */}
        <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Your Smart Card Link
                  </h3>
                  <p className="text-xs text-slate-500">Ready for instant sharing</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Card Linked
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your physical KonekTap card is automatically synced to this link. Any changes you
              make to your profile or social links will update on your card in real-time.
            </p>

            <div className="space-y-2">
              <label
                htmlFor="nfc-profile-url"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Direct Profile URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={urlInputRef}
                  id="nfc-profile-url"
                  readOnly
                  value={profileUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className={URL_INPUT_CLASS}
                />
                <button
                  onClick={() => handleCopy("url")}
                  type="button"
                  aria-label={copiedKey === "url" ? "Link copied" : "Copy profile link"}
                  className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 ${
                    copiedKey === "url"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500"
                  }`}
                >
                  {copiedKey === "url" ? (
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
                <div
                  role="alert"
                  className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    Your profile is currently unpublished. Enable it in Profile Info so others can
                    view your card.
                  </span>
                </div>
              )}
            </div>

            {/* Upsell: extra card or desktop stand */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-brand-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Need a replacement or custom desktop stand?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Order an additional NFC card or QR stand linked to your profile.
                  </p>
                </div>
              </div>
              <a
                href={ORDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shrink-0 transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Order Now
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              Preview your live digital card <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Digital QR Pass (for people without NFC) */}
        <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-slate-900 dark:text-white" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Digital QR Pass</h3>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Save this QR code to your phone gallery as a backup, or let clients scan it directly
            from your screen.
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
              role="img"
              aria-label={`QR code for ${profileUrl}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
            <button
              onClick={handleDownloadPNG}
              type="button"
              disabled={busy !== null}
              className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
            >
              {busy === "png" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {busy === "png" ? "Preparing image..." : "Save QR to Phone (PNG)"}
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY SECTION */}
      {isAdmin && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Wrench className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm uppercase tracking-wider">
              KonekTap Admin Manufacturing Tools (Hidden from Clients)
            </h4>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Use the URI below to write to the client&apos;s NTAG215/NTAG216 chip, or download the
            vector SVG to extrude the QR code in Bambu Studio / CAD.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="nfc-admin-uri"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              NFC Chip URI
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={adminInputRef}
                id="nfc-admin-uri"
                readOnly
                value={profileUrl}
                onFocus={(e) => e.currentTarget.select()}
                className={URL_INPUT_CLASS}
              />
              <button
                onClick={() => handleCopy("admin")}
                type="button"
                aria-label={copiedKey === "admin" ? "URI copied" : "Copy NFC URI"}
                className={`px-4 py-3 rounded-xl font-semibold text-xs transition-all shrink-0 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 ${
                  copiedKey === "admin"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-amber-600 dark:hover:bg-amber-500"
                }`}
              >
                {copiedKey === "admin" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedKey === "admin" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadSVG}
              type="button"
              disabled={busy !== null}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2"
            >
              {busy === "svg" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {busy === "svg" ? "Exporting..." : "Download Vector SVG (For 3D Print / Layout)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}