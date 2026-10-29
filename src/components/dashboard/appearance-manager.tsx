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
  [key: string]: unknown;
};

const THEMES = [
  { id: "default", name: "KonekTap Signature", gradient: "bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-500", text: "text-indigo-500" },
  { id: "emerald", name: "Emerald Minimal", gradient: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700", text: "text-emerald-500" },
  { id: "midnight", name: "Midnight Gold", gradient: "bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900", text: "text-amber-500" },
  { id: "rose", name: "Crimson Rose", gradient: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-600", text: "text-rose-500" },
  { id: "cyber", name: "Cyber Neon", gradient: "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600", text: "text-cyan-500" },
];

const FONTS = [
  { id: "font-sans", name: "Modern (Sans)", class: "font-sans" },
  { id: "font-serif", name: "Elegant (Serif)", class: "font-serif" },
  { id: "font-mono", name: "Tech (Mono)", class: "font-mono" },
];

const BUTTON_SHAPES = [
  { id: "rounded-full", name: "Pill", sample: "rounded-full" },
  { id: "rounded-2xl", name: "Rounded", sample: "rounded-xl" },
  { id: "rounded-none", name: "Sharp", sample: "rounded-none" },
];

const COLOR_MODES = [
  { id: "system", name: "System (Auto)" },
  { id: "light", name: "Always Light" },
  { id: "dark", name: "Always Dark" },
];

// Live Preview surfaces per color mode. Full class names are written out
// so Tailwind can detect them.
type PreviewSurface = {
  card: string;
  avatarBorder: string;
  badgeBorder: string;
  name: string;
  handle: string;
  divider: string;
  bio: string;
  primaryBtn: string;
  qrBtn: string;
};

const PREVIEW_SURFACES: Record<string, PreviewSurface> = {
  dark: {
    card: "bg-[#0f1421] border-white/10",
    avatarBorder: "border-[#171c28]",
    badgeBorder: "border-[#0f1421]",
    name: "text-white",
    handle: "bg-white/5 text-slate-400 border-white/5",
    divider: "border-white/10",
    bio: "text-slate-400",
    primaryBtn: "bg-white text-slate-900",
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
    primaryBtn: "bg-slate-900 text-white",
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
    primaryBtn:
      "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    qrBtn:
      "bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white",
  },
};

const MAX_BANNER_MB = 10;

export function AppearanceManager({ profile }: { profile: AppearanceProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Saved values (used to detect unsaved changes and for Reset)
  const initialTheme = profile?.theme || "default";
  const initialFont = profile?.font_style || "font-sans";
  const initialShape = profile?.button_shape || "rounded-2xl";
  const initialMode = profile?.color_mode || "system";

  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [fontStyle, setFontStyle] = useState(initialFont);
  const [buttonShape, setButtonShape] = useState(initialShape);
  const [colorMode, setColorMode] = useState(initialMode);

  // Banner States
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    profile?.banner_url || null
  );
  const [removeBanner, setRemoveBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping States
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const isBusy = isPending || isCompressing;
  const currentTheme = THEMES.find((t) => t.id === selectedTheme) ?? THEMES[0];
  const surface = PREVIEW_SURFACES[colorMode] ?? PREVIEW_SURFACES.system;

  // Real name and username for the preview, with fallbacks
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

  /* ---------------- Object URL bookkeeping (prevents memory leaks) ---------------- */

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

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  /* ---------------- Banner handlers ---------------- */

  // 1. When a file is chosen, validate it and open the Cropper
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the user pick the same file again later
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

  // 2. Get the exact pixels while the image is being moved
  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // 3. Cut the image with the helper function
  async function handleSaveCrop() {
    if (!imageToCrop || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (blob) {
        revokeUrl(bannerPreview); // free the previous crop preview (no-op for saved URLs)
        setCroppedBlob(blob);
        setBannerPreview(createUrl(blob)); // show the cropped result as the preview
        revokeUrl(imageToCrop);
        setImageToCrop(null); // close the cropper UI
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
    // Only needs a server-side removal if a banner is already saved
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

  /* ---------------- Submit ---------------- */

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    // Use the current form so the hidden inputs are included
    const formData = new FormData(e.currentTarget);

    // Set the values from state
    formData.set("theme", selectedTheme);
    formData.set("font_style", fontStyle);
    formData.set("button_shape", buttonShape);
    formData.set("color_mode", colorMode);

    if (removeBanner) {
      formData.set("remove_banner", "true");
    }

    // Compress the CROPPED BLOB if there's a new crop, and add it to the formData
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
        // Nothing is reset on error, so the user's choices are kept
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
      {/* STATUS FEEDBACK BANNER */}
      {feedback && (
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

        {/* No name="banner" here: the cropped blob is appended manually on submit */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imageToCrop ? (
          /* Cropper UI (only shown after choosing a file) */
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
          /* Normal Preview UI */
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
          /* Empty state */
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
              <label key={font.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="font_style_option"
                  checked={fontStyle === font.id}
                  onChange={() => setFontStyle(font.id)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <span className={`text-sm text-slate-700 dark:text-slate-200 ${font.class}`}>
                  {font.name}
                </span>
              </label>
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
              <label
                key={btn.id}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="button_shape_option"
                    checked={buttonShape === btn.id}
                    onChange={() => setButtonShape(btn.id)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {btn.name}
                  </span>
                </div>
                <div className={`w-8 h-4 bg-slate-200 dark:bg-slate-700 ${btn.sample}`} />
              </label>
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
              <label key={mode.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="color_mode_option"
                  checked={colorMode === mode.id}
                  onChange={() => setColorMode(mode.id)}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {mode.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* 4. LIVE PREVIEW (matches the public card layout) */}
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

        <div
          className={`max-w-sm mx-auto overflow-hidden border shadow-xl ${surface.card} ${fontStyle}`}
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
                className={`w-[88px] h-[88px] border-4 bg-slate-700 flex items-center justify-center overflow-hidden ${surface.avatarBorder} ${buttonShape}`}
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
            <p className={`mt-3 text-sm font-semibold ${currentTheme.text}`}>
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
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3 text-xs font-semibold shadow-[0_10px_30px_-8px_rgba(99,102,241,0.55)] ${surface.primaryBtn} ${buttonShape}`}
              >
                <UserPlus className="w-4 h-4" />
                Save to Contacts
              </div>
              <div
                className={`w-12 h-12 shrink-0 border flex items-center justify-center ${surface.qrBtn} ${buttonShape}`}
              >
                <QrCode className="w-5 h-5" />
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