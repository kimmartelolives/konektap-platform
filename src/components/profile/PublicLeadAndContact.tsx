"use client";

import { useState } from "react";
import { UserPlus, X, Send, CheckCircle2 } from "lucide-react";
import { submitPublicLead } from "@/app/dashboard/leads/actions";

interface PublicLeadAndContactProps {
  profileId: string;
  username: string;
  publicPhone?: string | null;
  publicEmail?: string | null;
  showLeadForm?: boolean;
  userTier?: "demo" | "standard" | "premium";
}

export default function PublicLeadAndContact({
  profileId,
  username,
  showLeadForm = true,
  userTier = "demo",
}: PublicLeadAndContactProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canCaptureLeads = (userTier === "standard" || userTier === "premium") && showLeadForm;

  if (!canCaptureLeads) {
    return null;
  }

  async function handleAction(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg(null);
    const res = await submitPublicLead(formData);
    setIsSubmitting(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitted(false);
      }, 1800);
    }
  }

  return (
    <div className="w-full space-y-3 my-2">
      {/* Exchange Contact / Lead Capture Trigger Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-2xl bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-800 border border-slate-200 dark:border-white/10 font-semibold text-sm text-slate-900 dark:text-white transition shadow-sm"
      >
        <UserPlus className="w-4 h-4 text-brand-500" />
        Inquire / Get in Touch
      </button>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Contact Shared!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your details have been sent.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Connect with @{username}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Leave your contact details so they can save them or get back to you.
                </p>

                <form action={handleAction} className="space-y-3">
                  <input type="hidden" name="profile_id" value={profileId} />
                  <input type="hidden" name="username" value={username} />

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="visitor_name"
                      required
                      placeholder="John Smith"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        name="visitor_phone"
                        required
                        placeholder="0917xxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="visitor_email"
                        required
                        placeholder="you@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Short Note / Inquiry
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={2}
                      placeholder="Nice meeting you! Let's collaborate..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? "Sending..." : "Send Contact Info"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}