"use client";

import { useState, useTransition } from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { updateProfile } from "@/app/dashboard/actions";

export function ProfileForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
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
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === 'error' 
            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Page Link Slug <span className="text-rose-400">*</span></label>
        <div className="flex items-center rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus-within:border-brand-500 px-3.5 py-2.5 transition">
          <span className="font-mono text-xs text-slate-400 select-none">konektap.com/</span>
          <input 
            name="username" 
            defaultValue={initialData?.username || ""}
            className="font-mono text-sm text-slate-900 dark:text-white font-semibold bg-transparent focus:outline-none w-full"
            placeholder="yourname"
          />
        </div>
        <p className="text-[10px] text-slate-500">This will be your public URL. Use letters, numbers, and dashes only.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
          <input 
            name="full_name" 
            defaultValue={initialData?.full_name || ""}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition"
            placeholder="e.g. Zandra Ling"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Profession / Title</label>
          <input 
            name="profession" 
            defaultValue={initialData?.profession || ""}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition"
            placeholder="e.g. Senior Real Estate Consultant"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Public Email (Saved to Phone Contact)</label>
          <input 
            name="email_public" 
            type="email"
            defaultValue={initialData?.email_public || ""}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition"
            placeholder="hello@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Public Phone (Saved to Phone Contact)</label>
          <input 
            name="phone_public" 
            type="tel"
            defaultValue={initialData?.phone_public || ""}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition"
            placeholder="+63 917 000 0000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Short Biography</label>
        <textarea 
          name="bio" 
          rows={3}
          defaultValue={initialData?.bio || ""}
          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:outline-none text-sm text-slate-900 dark:text-white transition resize-none"
          placeholder="A brief introduction about yourself and what you do..."
        />
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold text-slate-900 dark:text-white block">Publish Profile</label>
          
          <p className="text-xs text-slate-500">Make your konektap.com link active and visible to the public.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" name="is_published" defaultChecked={initialData?.is_published} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
        </label>
      </div>

      <div className="pt-2 flex justify-end">
        <button 
          type="submit" 
          disabled={isPending}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 text-white font-semibold text-sm shadow-lg transition flex items-center gap-2 disabled:opacity-70"
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}