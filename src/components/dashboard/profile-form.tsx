"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/dashboard/profile/actions";
import { Save, User, Briefcase, FileText, Phone, Mail, Link as LinkIcon } from "lucide-react";

export function ProfileForm({ profile }: { profile: any }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {message && (
        <div className={`p-4 rounded-xl text-sm font-semibold ${message.type === "error" ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {/* Profile Link Claim */}
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
            defaultValue={profile.username || ""}
            required
            pattern="[a-zA-Z0-9_]+"
            title="Only letters, numbers, and underscores allowed"
            placeholder="kimmartelolives"
            className="flex-1 px-4 py-3 bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-r-xl focus:border-brand-500 outline-none text-slate-900 dark:text-white font-mono transition-colors" 
          />
        </div>
        <p className="text-xs text-slate-500">This is your unique NFC tap link. Use only letters, numbers, and underscores.</p>
      </div>

      {/* Basic Info */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Public Information</h3>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
          <input name="full_name" defaultValue={profile.full_name || ""} required className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Profession / Tagline</label>
          <input name="profession" defaultValue={profile.profession || ""} placeholder="e.g. Full-Stack Software Engineer" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Bio</label>
          <textarea name="bio" defaultValue={profile.bio || ""} rows={3} placeholder="Write a short bio about what you do..." className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors resize-none" />
        </div>
      </div>

      {/* Contact Grid */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Direct Contact (vCard)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Public Phone</label>
            <input name="phone_public" defaultValue={profile.phone_public || ""} placeholder="+63 912 345 6789" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Public Email</label>
            <input name="email_public" type="email" defaultValue={profile.email_public || ""} placeholder="hello@example.com" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none transition-colors" />
          </div>
        </div>
      </div>

      {/* Publish Toggle & Submit */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 glass-card rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="is_published" defaultChecked={profile.is_published} className="w-5 h-5 accent-brand-500 cursor-pointer rounded-md" />
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