"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Camera,
  User,
  Link as LinkIcon,
  Briefcase,
  FileText,
  Phone,
  Mail,
  Loader2,
  X,
  Lock,
} from "lucide-react";
import { updateProfile } from "@/app/dashboard/profile/actions";
import imageCompression from "browser-image-compression";

type ProfileFormProfile = {
  tier?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  full_name?: string | null;
  profession?: string | null;
  bio?: string | null;
  phone_public?: string | null;
  email_public?: string | null;
  is_published?: boolean | null;
  [key: string]: unknown;
};

const MAX_AVATAR_MB = 2;
const DEMO_LOCK_MESSAGE =
  "Custom profile picture upload requires a Standard or Premium plan.";

// ---- FIELD LIMITS ----
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const FULL_NAME_MAX = 60;
const PROFESSION_MAX = 80;
const BIO_MAX = 300;
const PHONE_MAX = 20;
const EMAIL_MAX = 100;

const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
      >
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function CharCount({ length, max }: { length: number; max: number }) {
  return (
    <p
      className={`text-[11px] text-right ${
        length >= max ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
      }`}
    >
      {length}/{max}
    </p>
  );
}

// Input na may built-in na character counter
function CountedInput({
  maxLength,
  defaultValue,
  onChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { maxLength: number }) {
  const [length, setLength] = useState(String(defaultValue ?? "").length);

  return (
    <>
      <input
        {...props}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(e) => {
          setLength(e.target.value.length);
          onChange?.(e);
        }}
      />
      <CharCount length={length} max={maxLength} />
    </>
  );
}

export function ProfileForm({ profile }: { profile: ProfileFormProfile }) {
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Image preview (blob URLs are tracked so they can be released)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null
  );
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bioLength, setBioLength] = useState((profile?.bio || "").length);
  const [usernameLength, setUsernameLength] = useState(
    (profile?.username || "").length
  );

  const isDemo = (profile?.tier || "demo") === "demo";
  const isBusy = isPending || isCompressing;

  function releaseBlobUrl() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  useEffect(() => releaseBlobUrl, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(
      () => setMessage(null),
      message.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [message]);

  function openFilePicker() {
    if (isDemo) {
      setMessage({ type: "error", text: DEMO_LOCK_MESSAGE });
      return;
    }
    fileInputRef.current?.click();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isDemo) return;
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      input.value = "";
      setMessage({ type: "error", text: "Please choose an image file (JPG or PNG)." });
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      input.value = "";
      setMessage({
        type: "error",
        text: `Image is too large. Max size is ${MAX_AVATAR_MB}MB.`,
      });
      return;
    }

    setMessage(null);
    releaseBlobUrl();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setAvatarPreview(url);
  }

  // onSubmit (hindi action) para hindi ma-reset ng React 19 ang form
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isBusy) return;
    setMessage(null);

    // Kunin agad ang FormData bago ang anumang await
    const formData = new FormData(e.currentTarget);
    const avatarFile = formData.get("avatar");

    if (avatarFile instanceof File && avatarFile.size > 0) {
      if (isDemo) {
        setMessage({ type: "error", text: DEMO_LOCK_MESSAGE });
        return;
      }

      setIsCompressing(true);
      try {
        const compressedFile = await imageCompression(avatarFile, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
        formData.set("avatar", compressedFile, compressedFile.name);
      } catch (error) {
        console.error("Compression error:", error);
        setMessage({
          type: "error",
          text: "Failed to compress the image. Please try another one.",
        });
        setIsCompressing(false);
        return;
      }
      setIsCompressing(false);
    }

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result?.success) {
        // The file input is intentionally left as-is: the server may not have
        // refreshed `existing_avatar_url` yet, and re-sending the same image is harmless.
        setMessage({ type: "success", text: "Profile updated successfully!" });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card p-6 md:p-8 rounded-3xl shadow-xl space-y-6"
    >
      {/* Sticky so feedback is visible even when the Save button is far down */}
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

      {/* Keeps the current picture URL when no new file is chosen */}
      <input
        type="hidden"
        name="existing_avatar_url"
        value={profile?.avatar_url || ""}
      />

      {/* AVATAR UPLOADER (locked on the Demo tier) */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={openFilePicker}
          aria-label={isDemo ? "Profile picture (locked on Demo plan)" : "Change profile picture"}
          aria-disabled={isDemo}
          className={`relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 ${
            isDemo ? "cursor-not-allowed opacity-80" : "cursor-pointer"
          }`}
        >
          <span className="block w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-dark-900 shadow-lg relative">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-slate-400" />
              </span>
            )}

            <span
              className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                isDemo ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              {isDemo ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-md">
                  <Lock className="w-2.5 h-2.5" /> LOCKED
                </span>
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </span>
          </span>

          {!isDemo && (
            <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-500 text-white shadow-sm border-2 border-white dark:border-dark-900 group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          disabled={isDemo}
          onChange={handleImageChange}
          className="hidden"
        />

        <div className="text-center sm:text-left pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
            Profile Picture
            {isDemo && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">
                Demo Locked
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
            {isDemo
              ? "Upgrading to Standard or Premium is required to change your custom avatar."
              : `Upload a square image (JPG, PNG). Max size ${MAX_AVATAR_MB}MB.`}
          </p>
        </div>
      </div>

      {/* USERNAME */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-4 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="w-5 h-5 text-brand-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">Your KonekTap Link</h3>
        </div>
        <div className="flex items-stretch">
          <label
            htmlFor="pf-username"
            className="px-4 py-3 bg-slate-100 dark:bg-dark-950 border border-r-0 border-slate-200 dark:border-white/10 rounded-l-xl text-slate-500 text-sm font-mono flex items-center whitespace-nowrap"
          >
            konektap.com/@
          </label>
          <input
            id="pf-username"
            name="username"
            defaultValue={profile?.username || ""}
            required
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            pattern="[a-zA-Z0-9_]+"
            title={`${USERNAME_MIN}-${USERNAME_MAX} characters. Only letters, numbers, and underscores allowed`}
            placeholder="juandelacruz"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setUsernameLength(e.target.value.length)}
            className="min-w-0 flex-1 px-4 py-3 bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-r-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-slate-900 dark:text-white font-mono transition-colors"
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs text-slate-500">
            This is your unique NFC tap link. {USERNAME_MIN}-{USERNAME_MAX} characters,
            letters, numbers, and underscores only.
          </p>
          <div className="shrink-0">
            <CharCount length={usernameLength} max={USERNAME_MAX} />
          </div>
        </div>
      </div>

      {/* PUBLIC INFO */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Public Information</h3>

        <Field id="pf-full-name" label="Full Name" icon={<User className="w-3.5 h-3.5" />}>
          <CountedInput
            id="pf-full-name"
            name="full_name"
            defaultValue={profile?.full_name || ""}
            required
            maxLength={FULL_NAME_MAX}
            autoComplete="name"
            className={INPUT_CLASS}
          />
        </Field>

        <Field
          id="pf-profession"
          label="Profession / Tagline"
          icon={<Briefcase className="w-3.5 h-3.5" />}
        >
          <CountedInput
            id="pf-profession"
            name="profession"
            defaultValue={profile?.profession || ""}
            maxLength={PROFESSION_MAX}
            placeholder="e.g. Full-Stack Software Engineer"
            autoComplete="organization-title"
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="pf-bio" label="Bio" icon={<FileText className="w-3.5 h-3.5" />}>
          <textarea
            id="pf-bio"
            name="bio"
            defaultValue={profile?.bio || ""}
            rows={3}
            maxLength={BIO_MAX}
            onChange={(e) => setBioLength(e.target.value.length)}
            placeholder="Write a short bio about what you do..."
            className={`${INPUT_CLASS} resize-none`}
          />
          <CharCount length={bioLength} max={BIO_MAX} />
        </Field>
      </div>

      {/* DIRECT CONTACT */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 space-y-5 bg-white dark:bg-dark-900">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Direct Contact (vCard)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field id="pf-phone" label="Public Phone" icon={<Phone className="w-3.5 h-3.5" />}>
            <CountedInput
              id="pf-phone"
              name="phone_public"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={profile?.phone_public || ""}
              maxLength={PHONE_MAX}
              pattern="[0-9+\s\-\(\)]*"
              title="Numbers, spaces, +, -, and parentheses only"
              placeholder="+63 912 345 6789"
              className={INPUT_CLASS}
            />
          </Field>
          <Field id="pf-email" label="Public Email" icon={<Mail className="w-3.5 h-3.5" />}>
            <CountedInput
              id="pf-email"
              name="email_public"
              type="email"
              autoComplete="email"
              defaultValue={profile?.email_public || ""}
              maxLength={EMAIL_MAX}
              placeholder="hello@example.com"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </div>

      {/* PUBLISH + SAVE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 glass-card rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={!!profile?.is_published}
            className="w-5 h-5 accent-brand-500 cursor-pointer rounded-md"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Publish Profile</span>
            <span className="text-xs text-slate-500">Make your KonekTap link public</span>
          </div>
        </label>

        <button
          type="submit"
          disabled={isBusy}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isCompressing ? "Optimizing photo..." : isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}