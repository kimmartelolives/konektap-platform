"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Save,
  Loader2,
  Palette,
  Image as ImageIcon,
  Type,
  Square,
  Moon,
  X,
  Crop,
  AlertCircle,
  RotateCcw,
  Eye,
  Pencil,
  ShieldCheck,
  UserPlus,
  QrCode,
  Copy,
  Check,
  Lock,
  Sparkles,
  Info,
} from "lucide-react";
import { updateAppearance } from "@/app/dashboard/appearance/actions";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/utils/cropImage";

type AppearanceProfile = {
  theme?: string | null;
  font_style?: string | null;
  button_shape?: string | null;
  color_mode?: string | null;
  banner_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  tier?: string | null;
  [key: string]: unknown;
};

/* ---------------- Static config (mirrors the public profile page) ---------------- */

const THEMES = [
  {
    id: "default",
    name: "KonekTap Signature",
    gradient: "bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-500",
    text: "text-brand-600 dark:text-accent-400",
    glassText: "text-accent-400",
    button: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-brand-500/25",
    glow: "bg-gradient-to-br from-brand-500 via-indigo-500 to-accent-500",
  },
  {
    id: "executive",
    name: "Executive Pearl",
    gradient: "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 border border-slate-200",
    text: "text-indigo-600 dark:text-indigo-400",
    glassText: "text-indigo-300",
    button: "bg-indigo-600 text-white shadow-indigo-500/25",
    glow: "bg-gradient-to-br from-blue-400 via-indigo-500 to-slate-400",
  },
  {
    id: "corporate",
    name: "Corporate Obsidian",
    gradient: "bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 border border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    glassText: "text-slate-300",
    button: "bg-slate-800 text-white shadow-slate-900/25 border border-slate-700",
    glow: "bg-gradient-to-br from-slate-700 via-indigo-900 to-slate-950",
  },
  {
    id: "luxe",
    name: "Golden Luxe",
    gradient: "bg-gradient-to-br from-amber-600 via-yellow-700 to-stone-900",
    text: "text-amber-600 dark:text-amber-400",
    glassText: "text-amber-300",
    button: "bg-amber-500 text-slate-950 shadow-amber-500/25",
    glow: "bg-gradient-to-br from-amber-500 via-yellow-600 to-stone-900",
  },
  {
    id: "emerald",
    name: "Emerald Minimal",
    gradient: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700",
    text: "text-emerald-600 dark:text-emerald-400",
    glassText: "text-emerald-400",
    button: "bg-emerald-600 text-white shadow-emerald-500/25",
    glow: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500",
  },
  {
    id: "midnight",
    name: "Midnight Gold",
    gradient: "bg-gradient-to-br from-slate-950 via-slate-800 to-zinc-900",
    text: "text-amber-600 dark:text-amber-400",
    glassText: "text-amber-400",
    button: "bg-amber-500 text-slate-900 shadow-amber-500/25",
    glow: "bg-gradient-to-br from-amber-500 via-indigo-600 to-purple-700",
  },
  {
    id: "rose",
    name: "Crimson Rose",
    gradient: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-600",
    text: "text-rose-600 dark:text-rose-400",
    glassText: "text-rose-400",
    button: "bg-rose-600 text-white shadow-rose-500/25",
    glow: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-500",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    gradient: "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600",
    text: "text-cyan-600 dark:text-cyan-400",
    glassText: "text-cyan-400",
    button: "bg-cyan-500 text-slate-900 shadow-cyan-500/25",
    glow: "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500",
  },
  {
    id: "amethyst",
    name: "Amethyst Aura",
    gradient: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600",
    text: "text-violet-600 dark:text-violet-400",
    glassText: "text-violet-400",
    button: "bg-purple-600 text-white shadow-purple-500/25",
    glow: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500",
  },
];

const FONTS = [
  {
    id: "font-sans",
    name: "Modern (Sans)",
    class: "font-sans",
    style: { fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
    premiumOnly: false,
  },
  {
    id: "font-serif",
    name: "Elegant (Serif)",
    class: "font-serif",
    style: { fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', serif" },
    premiumOnly: false,
  },
  {
    id: "font-mono",
    name: "Tech (Mono)",
    class: "font-mono tracking-tight",
    style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace" },
    premiumOnly: false,
  },
  {
    id: "font-display",
    name: "Geometric (Display)",
    class: "font-display tracking-wide",
    style: { fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, sans-serif", letterSpacing: "0.02em" },
    premiumOnly: false,
  },
  {
    id: "font-futura",
    name: "Futura",
    class: "tracking-wide",
    style: { fontFamily: "Futura, 'Futura PT', 'Jost', 'Century Gothic', 'Trebuchet MS', sans-serif" },
    premiumOnly: true,
  },
];

const BUTTON_SHAPES = [
  { id: "rounded-full", name: "Pill", sample: "rounded-full", premiumOnly: false },
  { id: "rounded-2xl", name: "Rounded", sample: "rounded-2xl", premiumOnly: false },
  { id: "rounded-lg", name: "Soft Edge", sample: "rounded-md", premiumOnly: false },
  { id: "rounded-none", name: "Sharp", sample: "rounded-none", premiumOnly: false },
  { id: "rounded-[32px]", name: "Super Oval", sample: "rounded-[32px]", premiumOnly: true },
];

const COLOR_MODES = [
  { id: "system", name: "System (Auto)", premiumOnly: false },
  { id: "light", name: "Always Light", premiumOnly: false },
  { id: "dark", name: "Always Dark", premiumOnly: false },
  { id: "glass", name: "Midnight Glass", premiumOnly: true },
  { id: "business-glass", name: "Corporate Frosted", premiumOnly: true },
];

type PreviewSurface = {
  card: string;
  avatarBorder: string;
  badgeBorder: string;
  name: string;
  handle: string;
  divider: string;
  bio: string;
  qrBtn: string;
};

const PREVIEW_SURFACES: Record<string, PreviewSurface> = {
  dark: {
    card: "bg-[#0f1421] border-white/10 dark",
    avatarBorder: "border-[#171c28]",
    badgeBorder: "border-[#0f1421]",
    name: "text-white",
    handle: "bg-white/5 text-slate-400 border-white/5",
    divider: "border-white/10",
    bio: "text-slate-400",
    qrBtn: "bg-white/5 border-white/10 text-white",
  },
  light: {
    card: "bg-white border-slate-200",
    avatarBorder: "border-white",
    badgeBorder: "border-white",
    name: "text-slate-900",
    handle: "bg-slate-100 text-slate-500 border-slate-200",
    divider: "border-slate-200",
    bio: "text-slate-500",
    qrBtn: "bg-slate-100 border-slate-200 text-slate-700",
  },
  system: {
    card: "bg-white dark:bg-[#0f1421] border-slate-200 dark:border-white/10",
    avatarBorder: "border-white dark:border-[#171c28]",
    badgeBorder: "border-white dark:border-[#0f1421]",
    name: "text-slate-900 dark:text-white",
    handle:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5",
    divider: "border-slate-200 dark:border-white/10",
    bio: "text-slate-500 dark:text-slate-400",
    qrBtn:
      "bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white",
  },
  glass: {
    card: "bg-gradient-to-b from-slate-900/90 via-indigo-950/90 to-slate-950/95 backdrop-blur-2xl border-white/20 ring-1 ring-white/10 text-white",
    avatarBorder: "border-slate-900",
    badgeBorder: "border-slate-900",
    name: "text-white",
    handle: "bg-white/10 text-indigo-200 border-white/15 backdrop-blur-md",
    divider: "border-white/15",
    bio: "text-slate-300",
    qrBtn: "bg-white/10 border-white/20 text-white backdrop-blur-md",
  },
  "business-glass": {
    card: "bg-white/70 backdrop-blur-xl border-slate-200/70 ring-1 ring-white/70 text-slate-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]",
    avatarBorder: "border-white",
    badgeBorder: "border-white",
    name: "text-slate-900",
    handle: "bg-slate-100 text-slate-700 border-slate-200",
    divider: "border-slate-200",
    bio: "text-slate-600",
    qrBtn: "bg-slate-100 border-slate-200 text-slate-700",
  },
};

const MAX_BANNER_MB = 10;
const SUPER_OVAL = "rounded-[32px]";

/* ---------------- Small shared components ---------------- */

function PremiumBadge({ locked }: { locked: boolean }) {
  return locked ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs">
      <Lock className="w-2.5 h-2.5" /> PREMIUM
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs">
      <Sparkles className="w-2.5 h-2.5 text-amber-500" /> PREMIUM
    </span>
  );
}

type ChoiceRowProps = {
  name: string;
  label: string;
  checked: boolean;
  locked: boolean;
  premium: boolean;
  accentClass: string;
  onSelect: () => void;
  onLockedClick: () => void;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  trailing?: React.ReactNode;
};

function ChoiceRow({
  name,
  label,
  checked,
  locked,
  premium,
  accentClass,
  onSelect,
  onLockedClick,
  labelClassName = "",
  labelStyle,
  trailing,
}: ChoiceRowProps) {
  return (
    <label
      onClick={(e) => {
        if (locked) {
          e.preventDefault();
          onLockedClick();
        }
      }}
      className={`flex items-center justify-between gap-3 ${
        locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="radio"
          name={name}
          checked={checked}
          disabled={locked}
          onChange={() => {
            if (!locked) onSelect();
          }}
          className={`w-4 h-4 cursor-pointer disabled:cursor-not-allowed ${accentClass}`}
        />
        <span
          style={labelStyle}
          className={`text-sm text-slate-700 dark:text-slate-200 ${labelClassName}`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        {premium && <PremiumBadge locked={locked} />}
      </div>
    </label>
  );
}

/* ---------------- Main component ---------------- */

export function AppearanceManager({ profile }: { profile: AppearanceProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isPremium = profile?.tier === "premium";

  const initialTheme = profile?.theme || "default";
  const initialFont =
    profile?.font_style === "font-editorial"
      ? "font-futura"
      : profile?.font_style || "font-sans";
  const initialShape = profile?.button_shape || "rounded-2xl";
  const initialMode = profile?.color_mode || "system";

  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [fontStyle, setFontStyle] = useState(initialFont);
  const [buttonShape, setButtonShape] = useState(initialShape);
  const [colorMode, setColorMode] = useState(initialMode);

  const [bannerPreview, setBannerPreview] = useState<string | null>(
    profile?.banner_url || null
  );
  const [removeBanner, setRemoveBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const isBusy = isPending || isCompressing;

  /* What the public page will really render: premium-only choices fall back
     for non-premium accounts, so the preview must do the same. */
  const isModeRestricted =
    (colorMode === "glass" || colorMode === "business-glass") && !isPremium;
  const isFontRestricted =
    !!FONTS.find((f) => f.id === fontStyle)?.premiumOnly && !isPremium;
  const isShapeRestricted = buttonShape === SUPER_OVAL && !isPremium;

  const effectiveMode = isModeRestricted ? "system" : colorMode;
  const effectiveFont = isFontRestricted ? "font-sans" : fontStyle;
  const effectiveShape = isShapeRestricted ? "rounded-2xl" : buttonShape;

  const fallbackNotes = [
    isModeRestricted ? "this color mode" : null,
    isFontRestricted ? "this font" : null,
    isShapeRestricted ? "this button shape" : null,
  ].filter(Boolean) as string[];

  const currentTheme = THEMES.find((t) => t.id === selectedTheme) ?? THEMES[0];
  const currentFont = FONTS.find((f) => f.id === effectiveFont) ?? FONTS[0];
  const surface = PREVIEW_SURFACES[effectiveMode] ?? PREVIEW_SURFACES.system;

  const isGlass = effectiveMode === "glass";
  const isFrosted = effectiveMode === "business-glass";

  const professionClass = isGlass ? currentTheme.glassText : currentTheme.text;
  const primaryBtnClass = isFrosted
    ? "bg-slate-900 text-white shadow-slate-900/20"
    : currentTheme.button;

  const stageClass = isGlass
    ? "bg-slate-950 border-white/10"
    : isFrosted
    ? "bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100 border-slate-200"
    : "bg-slate-900/5 dark:bg-dark-950/50 border-slate-200/60 dark:border-white/5";

  const previewName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : "Your Name";
  const previewUsername =
    typeof profile?.username === "string" && profile.username.trim()
      ? profile.username.trim()
      : "yourname";
  const previewInitial = previewName.charAt(0).toUpperCase();

  const isDirty =
    selectedTheme !== initialTheme ||
    fontStyle !== initialFont ||
    buttonShape !== initialShape ||
    colorMode !== initialMode ||
    croppedBlob !== null ||
    removeBanner;

  const blobUrlsRef = useRef<string[]>([]);

  function createUrl(source: Blob | File): string {
    const url = URL.createObjectURL(source);
    blobUrlsRef.current.push(url);
    return url;
  }

  function revokeUrl(url: string | null) {
    if (!url || !blobUrlsRef.current.includes(url)) return;
    URL.revokeObjectURL(url);
    blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== url);
  }

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  function showPremiumNotice(message: string) {
    setFeedback({ type: "error", message });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Please choose an image file." });
      return;
    }
    if (file.size > MAX_BANNER_MB * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: `Image is too large. Max size is ${MAX_BANNER_MB}MB.`,
      });
      return;
    }

    setFeedback(null);
    revokeUrl(imageToCrop);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageToCrop(createUrl(file));
    setRemoveBanner(false);
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSaveCrop() {
    if (!imageToCrop || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (blob) {
        revokeUrl(bannerPreview);
        setCroppedBlob(blob);
        setBannerPreview(createUrl(blob));
        revokeUrl(imageToCrop);
        setImageToCrop(null);
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Failed to crop image." });
    } finally {
      setIsCropping(false);
    }
  }

  function handleCancelCrop() {
    revokeUrl(imageToCrop);
    setImageToCrop(null);
  }

  function handleRemoveBanner() {
    revokeUrl(bannerPreview);
    setBannerPreview(null);
    setCroppedBlob(null);
    setRemoveBanner(!!profile?.banner_url);
  }

  function handleReset() {
    revokeUrl(bannerPreview);
    revokeUrl(imageToCrop);
    setImageToCrop(null);
    setSelectedTheme(initialTheme);
    setFontStyle(initialFont);
    setButtonShape(initialShape);
    setColorMode(initialMode);
    setBannerPreview(profile?.banner_url || null);
    setCroppedBlob(null);
    setRemoveBanner(false);
    setFeedback(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    formData.set("theme", selectedTheme);
    formData.set("font_style", effectiveFont);
    formData.set("button_shape", effectiveShape);
    formData.set("color_mode", effectiveMode);

    if (removeBanner) {
      formData.set("remove_banner", "true");
    }

    if (croppedBlob) {
      setIsCompressing(true);
      try {
        const bannerFile = new File([croppedBlob], "banner.jpg", {
          type: "image/jpeg",
        });
        const compressedFile = await imageCompression(bannerFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        formData.set("banner", compressedFile, compressedFile.name);
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: "Failed to process the banner image. Try a different one.",
        });
        setIsCompressing(false);
        return;
      }
      setIsCompressing(false);
    }

    startTransition(async () => {
      const result = await updateAppearance(formData);
      if (result?.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      setCroppedBlob(null);
      setRemoveBanner(false);
      setFeedback({ type: "success", message: "Appearance updated successfully!" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sticky so the message is always visible, even when a locked option
          far down the page is clicked. */}
      {feedback && (
        <div className="sticky top-4 z-30">
          <div className="rounded-2xl bg-white dark:bg-dark-900 shadow-lg">
            <div
              role={feedback.type === "error" ? "alert" : "status"}
              className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 ${
                feedback.type === "error"
                  ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              )}
              <span className="flex-1">{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CUSTOM BANNER WITH CROPPER */}
      <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Cover Photo / Banner
            </h3>
            <p className="text-xs text-slate-500">
              Drag to reposition your image (21:9 ratio).
            </p>
          </div>
        </div>

        <input
          type="hidden"
          name="existing_banner_url"
          value={profile?.banner_url || ""}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imageToCrop ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden bg-slate-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={21 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                  <span>Zoom</span>
                  <span className="text-slate-400">{zoom.toFixed(1)}x</span>
                </label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  disabled={isCropping}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  disabled={isCropping || !croppedAreaPixels}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-md flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCropping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crop className="w-4 h-4" />
                  )}
                  Save Position
                </button>
              </div>
            </div>
          </div>
        ) : bannerPreview ? (
          <div className="relative w-full aspect-[21/9] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-dark-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerPreview}
              alt="Banner Preview"
              className="w-full h-full object-cover"
            />
            {croppedBlob && (
              <div className="absolute top-3 left-3 bg-brand-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">
                UNSAVED
              </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-black/60 hover:bg-black/75 text-white rounded-full backdrop-blur-sm shadow-md transition cursor-pointer"
                aria-label="Change banner"
                title="Change banner"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemoveBanner}
                className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition cursor-pointer"
                aria-label="Remove banner"
                title="Remove banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[21/9] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-500 flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-950 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              Click to upload banner
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Images up to {MAX_BANNER_MB}MB. You can crop it next.
            </span>
          </button>
        )}
      </div>

      {/* 2. PROFILE THEME */}
      <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Color Theme
            </h3>
            <p className="text-xs text-slate-500">Choose your base color palette.</p>
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label="Color theme"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative text-left cursor-pointer rounded-2xl border-2 transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  isSelected
                    ? "border-emerald-500 shadow-md scale-[1.02]"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className={`h-16 w-full ${theme.gradient} opacity-90`} />
                <div className="p-3 bg-white dark:bg-dark-950 flex items-center justify-between">
                  <span className={`text-xs font-bold ${theme.text}`}>
                    {theme.name}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TYPOGRAPHY & BUTTONS & MODE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Typography */}
        <fieldset className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <legend className="sr-only">Font style</legend>
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Font Style
            </h3>
          </div>
          <div className="space-y-3">
            {FONTS.map((font) => (
              <ChoiceRow
                key={font.id}
                name="font_style_option"
                label={font.name}
                labelClassName={font.class}
                labelStyle={font.style}
                checked={fontStyle === font.id}
                locked={font.premiumOnly && !isPremium}
                premium={font.premiumOnly}
                accentClass="accent-amber-500"
                onSelect={() => setFontStyle(font.id)}
                onLockedClick={() =>
                  showPremiumNotice(`${font.name} font is exclusive to the PREMIUM plan.`)
                }
              />
            ))}
          </div>
        </fieldset>

        {/* Buttons */}
        <fieldset className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <legend className="sr-only">Button shape</legend>
          <div className="flex items-center gap-2 mb-4">
            <Square className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Button Shape
            </h3>
          </div>
          <div className="space-y-3">
            {BUTTON_SHAPES.map((btn) => (
              <ChoiceRow
                key={btn.id}
                name="button_shape_option"
                label={btn.name}
                checked={buttonShape === btn.id}
                locked={btn.premiumOnly && !isPremium}
                premium={btn.premiumOnly}
                accentClass="accent-blue-500"
                onSelect={() => setButtonShape(btn.id)}
                onLockedClick={() =>
                  showPremiumNotice(`${btn.name} button shape is exclusive to the PREMIUM plan.`)
                }
                trailing={
                  <div className={`w-8 h-4 bg-slate-200 dark:bg-slate-700 ${btn.sample}`} />
                }
              />
            ))}
          </div>
        </fieldset>

        {/* Color Mode */}
        <fieldset className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <legend className="sr-only">Color mode</legend>
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Color Mode
            </h3>
          </div>
          <div className="space-y-3">
            {COLOR_MODES.map((mode) => (
              <ChoiceRow
                key={mode.id}
                name="color_mode_option"
                label={mode.name}
                checked={colorMode === mode.id}
                locked={mode.premiumOnly && !isPremium}
                premium={mode.premiumOnly}
                accentClass="accent-purple-500"
                onSelect={() => setColorMode(mode.id)}
                onLockedClick={() =>
                  showPremiumNotice(`${mode.name} is exclusive to the PREMIUM plan.`)
                }
              />
            ))}
          </div>
        </fieldset>
      </div>

      {/* 4. LIVE PREVIEW */}
      <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Live Preview
            </h3>
            <p className="text-xs text-slate-500">
              Updates as you change the banner, theme, font, button shape, and color mode.
            </p>
          </div>
        </div>

        {fallbackNotes.length > 0 && (
          <div
            role="note"
            className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-start gap-2"
          >
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <span>
              Your current plan doesn&apos;t include {fallbackNotes.join(", ")}. Your public
              page shows the default instead, and the preview below matches that.
            </span>
          </div>
        )}

        {/* Preview stage. Glass modes get the same backdrop as the public page
            so the frosted/blurred effect is visible. */}
        <div
          className={`relative overflow-hidden p-6 sm:p-8 rounded-3xl border transition-colors ${stageClass}`}
        >
          {isGlass && (
            <div
              aria-hidden="true"
              className={`absolute top-6 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full opacity-40 blur-[90px] pointer-events-none ${currentTheme.glow}`}
            />
          )}
          {isFrosted && (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-16 -left-16 w-[280px] h-[280px] rounded-full bg-blue-900/15 blur-[90px] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute top-1/3 -right-16 w-[260px] h-[260px] rounded-full bg-slate-500/20 blur-[90px] pointer-events-none"
              />
            </>
          )}

          <div
            style={currentFont.style}
            className={`relative z-10 max-w-sm mx-auto overflow-hidden border shadow-xl rounded-3xl ${surface.card} ${currentFont.class}`}
          >
            {/* Banner */}
            <div className={`relative h-28 ${currentTheme.gradient}`}>
              {bannerPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerPreview}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                KonekTap Verified
              </div>
            </div>

            <div className="px-6 pb-6 text-center">
              {/* Avatar + verified badge */}
              <div className="relative w-fit mx-auto -mt-11">
                <div
                  className={`w-[88px] h-[88px] border-4 bg-slate-700 flex items-center justify-center overflow-hidden ${surface.avatarBorder} ${effectiveShape}`}
                >
                  <span className="text-3xl font-bold text-slate-400">
                    {previewInitial}
                  </span>
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 flex items-center justify-center ${surface.badgeBorder}`}
                >
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              </div>

              {/* Name, handle, title */}
              <h4 className={`mt-4 text-2xl font-bold tracking-tight ${surface.name}`}>
                {previewName}
              </h4>
              <div
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${surface.handle}`}
              >
                @{previewUsername}
                <Copy className="w-3 h-3" />
              </div>
              <p className={`mt-3 text-sm font-semibold ${professionClass}`}>
                Your title or business
              </p>

              {/* Divider + bio */}
              <div className={`mt-5 pt-4 border-t ${surface.divider}`}>
                <p className={`text-xs ${surface.bio}`}>
                  Your short bio appears here.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-3 text-xs font-semibold shadow-xl ${primaryBtnClass} ${effectiveShape}`}
                >
                  <UserPlus className="w-4 h-4" />
                  Save to Contacts
                </div>
                <div
                  className={`w-12 h-12 shrink-0 border flex items-center justify-center ${surface.qrBtn} ${effectiveShape}`}
                >
                  <QrCode className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE BAR */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4">
        {isDirty && (
          <>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 sm:mr-auto">
              You have unsaved changes
            </span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isBusy}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={isBusy || imageToCrop !== null || !isDirty}
          className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isCompressing
            ? "Optimizing banner..."
            : isPending
            ? "Applying Appearance..."
            : "Save All Changes"}
        </button>
      </div>
    </form>
  );
}