"use client";

import { useState, useTransition, useRef } from "react";
import { Save, AlertCircle, CheckCircle2, Camera, User, Link as LinkIcon, Briefcase, FileText, Phone, Mail } from "lucide-react";
import { updateProfile } from "@/app/dashboard/profile/actions";
import imageCompression from 'browser-image-compression';

export function ProfileForm({ profile }: { profile: any }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  // State para sa Image Preview
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDemo = (profile?.tier || 'demo') === 'demo';

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isDemo) return;
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(formData: FormData) {
    setMessage(null);

    const avatarFile = formData.get("avatar") as File;
    
    if (avatarFile && avatarFile.size > 0) {
      if (isDemo) {
        setMessage({ type: 'error', text: "Custom profile picture upload requires a Standard or Premium plan." });
        return;
      }

      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      try {
        const compressedFile = await imageCompression(avatarFile, options);
        formData.set("avatar", compressedFile, compressedFile.name);
      } catch (error) {
        console.error("Compression error:", error);
        setMessage({ type: 'error', text: "Failed to compress the image. Please try another one." });
        return;
      }
    }

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result?.success) {
        setMessage({ type: 'success', text: "Profile updated successfully!" });
      }
    });
  }

  return (
    <form action={handleSubmit} className="glass-card p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      
      {message && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.type === "error" ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
          {message.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Hidden input para ma-retain ang lumang picture url */}
      <input type="hidden" name="existing_avatar_url" value={profile?.avatar_url || ""} />

      {/* AVATAR UPLOADER UI (Locked kung Demo Tier) */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div 
          className={`relative group ${isDemo ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
          onClick={() => {
            if (isDemo) {
              setMessage({ type: 'error', text: "Custom profile picture upload requires a Standard or Premium plan." });
              return;
            }
            fileInputRef.current?.click();
          }}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-dark-900 shadow-lg flex items-center justify-center relative">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-slate-400" />
            )}
            
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isDemo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isDemo ? (
                <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-md">LOCKED</span>
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          
          {!isDemo && (
            <button type="button" className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-500 text-white shadow-sm border-2 border-white dark:border-dark-900 group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          <input 
            ref={fileInputRef}
            type="file" 
            name="avatar" 
            accept="image/*" 
            disabled={isDemo}
            onChange={handleImageChange}
            className="hidden" 
          />
        </div>
        <div className="text-center sm:text-left pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Profile Picture 
            {isDemo && <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">Demo Locked</span>}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
            {isDemo 
              ? "Upgrading to Standard or Premium is required to change your custom avatar." 
              : "Upload a square image (JPG, PNG). Max size 2MB."}
          </p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-4 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="w-5 h-5 text-brand-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">Your KonekTap Link</h3>
        </div>
        <div className="flex items-center">
          <span className="px-4 py-3 bg-slate-100 dark:bg-dark-950 border border-r-0 border-slate-200 dark:border-white/10 rounded-l-xl text-slate-500 text-sm font-mono">
            konektap.com/@
          </span>
          <input 
            name="username" 
            defaultValue={profile?.username || ""}
            required
            pattern="[a-zA-Z0-9_]+"
            title="Only letters, numbers, and underscores allowed"
            placeholder="kimmartelolives"
            className="flex-1 px-4 py-3 bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-r-xl focus:border-brand-500 outline-none text-slate-900 dark:text-white font-mono transition-colors" 
          />
        </div>
        <p className="text-xs text-slate-500">This is your unique NFC tap link. Use only letters, numbers, and underscores.</p>
      </div>

      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Public Information</h3>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
          <input name="full_name" defaultValue={profile?.full_name || ""} required className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Profession / Tagline</label>
          <input name="profession" defaultValue={profile?.profession || ""} placeholder="e.g. Full-Stack Software Engineer" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Bio</label>
          <textarea name="bio" defaultValue={profile?.bio || ""} rows={3} placeholder="Write a short bio about what you do..." className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors resize-none" />
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Direct Contact (vCard)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Public Phone</label>
            <input name="phone_public" defaultValue={profile?.phone_public || ""} placeholder="+63 912 345 6789" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Public Email</label>
            <input name="email_public" type="email" defaultValue={profile?.email_public || ""} placeholder="hello@example.com" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 glass-card rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="is_published" defaultChecked={profile?.is_published} className="w-5 h-5 accent-brand-500 cursor-pointer rounded-md" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Publish Profile</span>
            <span className="text-xs text-slate-500">Make your KonekTap link public</span>
          </div>
        </label>

        <button type="submit" disabled={isPending} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
          <Save className="w-4 h-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}