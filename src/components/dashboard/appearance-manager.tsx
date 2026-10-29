"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { CheckCircle2, Save, Loader2, Palette, Image as ImageIcon, Type, Square, Moon, X, Crop } from "lucide-react";
import { updateAppearance } from "@/app/dashboard/appearance/actions";
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/utils/cropImage';

const THEMES = [
  { id: "default", name: "KonekTap Signature", gradient: "bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-500", text: "text-indigo-500" },
  { id: "emerald", name: "Emerald Minimal", gradient: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700", text: "text-emerald-500" },
  { id: "midnight", name: "Midnight Gold", gradient: "bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900", text: "text-amber-500" },
  { id: "rose", name: "Crimson Rose", gradient: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-600", text: "text-rose-500" },
  { id: "cyber", name: "Cyber Neon", gradient: "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600", text: "text-cyan-500" },
];

export function AppearanceManager({ profile }: { profile: any }) {
  const [isPending, startTransition] = useTransition();
  
  const [selectedTheme, setSelectedTheme] = useState(profile?.theme || "default");
  const [fontStyle, setFontStyle] = useState(profile?.font_style || "font-sans");
  const [buttonShape, setButtonShape] = useState(profile?.button_shape || "rounded-2xl");
  const [colorMode, setColorMode] = useState(profile?.color_mode || "system");
  
  // Banner States
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile?.banner_url || null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping States
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  // 1. Kapag pumili ng file, basahin as URL at buksan ang Cropper
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setRemoveBanner(false);
    }
  }

  // 2. Kunin ang exact pixels kapag ginagalaw ang image
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. I-cut ang image gamit ang helper function
  async function handleSaveCrop() {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (blob) {
        setCroppedBlob(blob);
        setBannerPreview(URL.createObjectURL(blob)); // I-display ang na-crop as preview
        setImageToCrop(null); // Isara ang cropper UI
      }
    } catch (e) {
      console.error(e);
      alert("Failed to crop image.");
    }
  }

  function handleCancelCrop() {
    setImageToCrop(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveBanner() {
    setBannerPreview(null);
    setCroppedBlob(null);
    setRemoveBanner(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Gagamitin natin ang current form para masama yung mga <input type="hidden">
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // I-set ang mga values mula sa state
    formData.set("theme", selectedTheme);
    formData.set("font_style", fontStyle);
    formData.set("button_shape", buttonShape);
    formData.set("color_mode", colorMode);
    
    if (removeBanner) {
      formData.set("remove_banner", "true");
    }

    // I-compress ang CROPPED BLOB kung may bagong crop, at isama sa formData
    if (croppedBlob) {
      const bannerFile = new File([croppedBlob], "banner.jpg", { type: "image/jpeg" });
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
      try {
        const compressedFile = await imageCompression(bannerFile, options);
        formData.set("banner", compressedFile, compressedFile.name);
      } catch (error) {
        alert("Failed to compress banner image.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateAppearance(formData);
      if (result?.error) alert(result.error);
      else alert("Appearance updated successfully!");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* 1. CUSTOM BANNER WITH CROPPER */}
      <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cover Photo / Banner</h3>
            <p className="text-xs text-slate-500">Drag to reposition your image (21:9 ratio).</p>
          </div>
        </div>

        <input type="hidden" name="existing_banner_url" value={profile?.banner_url || ""} />
        
        {/* TANGGALIN NATIN ANG name="banner" DITO KASI TAYO NA ANG MAG-AAPEND MANUALLY NG CROPPED BLOB */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        {/* Cropper UI (Lalabas lang kapag pumili ng file) */}
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
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Zoom</label>
                <input 
                  type="range" value={zoom} min={1} max={3} step={0.1} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                  className="w-full accent-brand-500" 
                />
              </div>
              <button type="button" onClick={handleCancelCrop} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSaveCrop} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-md flex items-center gap-2 transition-colors">
                <Crop className="w-4 h-4" /> Save Position
              </button>
            </div>
          </div>
        ) : (
          /* Normal Preview UI */
          <div className="relative w-full aspect-[21/9] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-500 overflow-hidden group cursor-pointer bg-slate-50 dark:bg-dark-950 transition-colors">
            {bannerPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveBanner(); }} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-md">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-500">Click to upload banner</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. PROFILE THEME */}
      <div className="glass-card p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Color Theme</h3>
            <p className="text-xs text-slate-500">Choose your base color palette.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {THEMES.map((theme) => (
            <div key={theme.id} onClick={() => setSelectedTheme(theme.id)} className={`relative cursor-pointer rounded-2xl border-2 transition-all overflow-hidden group ${selectedTheme === theme.id ? "border-emerald-500 shadow-md scale-[1.02]" : "border-slate-200 dark:border-white/10"}`}>
              <div className={`h-16 w-full ${theme.gradient} opacity-90`} />
              <div className="p-3 bg-white dark:bg-dark-950 flex items-center justify-between">
                <span className={`text-xs font-bold ${theme.text}`}>{theme.name}</span>
                {selectedTheme === theme.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. TYPOGRAPHY & BUTTONS & MODE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Typography */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Font Style</h3>
          </div>
          <div className="space-y-3">
            {[
              { id: "font-sans", name: "Modern (Sans)", class: "font-sans" },
              { id: "font-serif", name: "Elegant (Serif)", class: "font-serif" },
              { id: "font-mono", name: "Tech (Mono)", class: "font-mono" },
            ].map(font => (
              <label key={font.id} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" checked={fontStyle === font.id} onChange={() => setFontStyle(font.id)} className="w-4 h-4 accent-amber-500" />
                <span className={`text-sm ${font.class}`}>{font.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <div className="flex items-center gap-2 mb-4">
            <Square className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Button Shape</h3>
          </div>
          <div className="space-y-3">
            {[
              { id: "rounded-full", name: "Pill", sample: "rounded-full" },
              { id: "rounded-2xl", name: "Rounded", sample: "rounded-xl" },
              { id: "rounded-none", name: "Sharp", sample: "rounded-none" },
            ].map(btn => (
              <label key={btn.id} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input type="radio" checked={buttonShape === btn.id} onChange={() => setButtonShape(btn.id)} className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">{btn.name}</span>
                </div>
                <div className={`w-8 h-4 bg-slate-200 dark:bg-slate-700 ${btn.sample}`}></div>
              </label>
            ))}
          </div>
        </div>

        {/* Color Mode */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Color Mode</h3>
          </div>
          <div className="space-y-3">
            {[
              { id: "system", name: "System (Auto)" },
              { id: "light", name: "Always Light" },
              { id: "dark", name: "Always Dark" },
            ].map(mode => (
              <label key={mode.id} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" checked={colorMode === mode.id} onChange={() => setColorMode(mode.id)} className="w-4 h-4 accent-purple-500" />
                <span className="text-sm">{mode.name}</span>
              </label>
            ))}
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={isPending || imageToCrop !== null} className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isPending ? "Applying Appearance..." : "Save All Changes"}
        </button>
      </div>
    </form>
  );
}