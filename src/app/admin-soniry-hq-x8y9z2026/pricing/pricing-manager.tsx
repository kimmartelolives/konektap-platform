"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  ListChecks,
  Loader2,
  RotateCcw,
  Save,
  Tag,
  TextQuote,
  X,
} from "lucide-react";
import { updatePricing } from "./actions";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Plan = {
  id: string;
  name: string;
  base_price: number | null;
  discount_price: number | null;
  discount_end_date: string | null;
  description: string | null;
  features: string[] | null;
};

type FormValues = {
  base_price: string;
  discount_price: string;
  discount_end_date: string; // datetime-local format, in the viewer's local time
  description: string;
  features: string; // one feature per line
};

type FormErrors = Partial<Record<keyof FormValues, string>>;
type Feedback = { type: "success" | "error"; message: string };

/* -------------------------------------------------------------------------- */
/* Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const DESCRIPTION_MAX = 120;
const FREE_PLAN_ID = "demo";

const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

const INPUT_ERROR_CLASS =
  "border-rose-400 dark:border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20";

const CARD_CLASS =
  "glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

/** ISO string from the database -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function planToValues(plan: Plan): FormValues {
  return {
    base_price: plan.base_price?.toString() ?? "",
    discount_price: plan.discount_price?.toString() ?? "",
    discount_end_date: toLocalInput(plan.discount_end_date),
    description: plan.description ?? "",
    features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
  };
}

function parseFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function validate(values: FormValues, isFree: boolean): FormErrors {
  const errors: FormErrors = {};

  // The free plan has no price or promo, so only paid plans are checked here.
  if (!isFree) {
    const base = Number(values.base_price);
    const hasPromo = values.discount_price.trim() !== "";
    const promo = Number(values.discount_price);

    if (values.base_price.trim() === "" || Number.isNaN(base) || base < 0) {
      errors.base_price = "Enter a price of 0 or more.";
    }

    if (hasPromo) {
      if (Number.isNaN(promo) || promo < 0) {
        errors.discount_price = "Enter a price of 0 or more.";
      } else if (!errors.base_price && promo >= base) {
        errors.discount_price = "Promo price must be lower than the base price.";
      }
    } else if (values.discount_end_date) {
      errors.discount_end_date = "Add a promo price, or clear the end date.";
    }
  }

  if (!values.description.trim()) {
    errors.description = "Add a short description.";
  } else if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  }

  if (parseFeatures(values.features).length === 0) {
    errors.features = "List at least one feature.";
  }

  return errors;
}

type PromoStatus = "none" | "active" | "scheduled-end" | "expired";

function getPromoStatus(values: FormValues, errors: FormErrors): PromoStatus {
  if (!values.discount_price.trim() || errors.discount_price) return "none";
  if (!values.discount_end_date) return "active";
  const end = new Date(values.discount_end_date).getTime();
  if (Number.isNaN(end)) return "active";
  return end < Date.now() ? "expired" : "scheduled-end";
}

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  icon,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
        >
          {icon} {label}
        </label>
        {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

function PromoBadge({ status }: { status: PromoStatus }) {
  const config: Record<PromoStatus, { label: string; className: string }> = {
    none: {
      label: "No promo",
      className: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    },
    active: {
      label: "Promo active",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
    "scheduled-end": {
      label: "Promo active, ends soon",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    },
    expired: {
      label: "Promo expired",
      className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    },
  };
  const { label, className } = config[status];
  return <span className={`text-xs font-medium px-2 py-1 rounded-md ${className}`}>{label}</span>;
}

/* -------------------------------------------------------------------------- */
/* Plan card                                                                  */
/* -------------------------------------------------------------------------- */

function PlanCard({
  plan,
  isSaving,
  isBusy,
  onSave,
}: {
  plan: Plan;
  isSaving: boolean;
  isBusy: boolean;
  onSave: (planId: string, formData: FormData, onSuccess: () => void) => void;
}) {
  const isFree = plan.id === FREE_PLAN_ID;
  const [baseline, setBaseline] = useState<FormValues>(() => planToValues(plan));
  const [values, setValues] = useState<FormValues>(baseline);

  // Pick up fresh data when the server sends an updated plan (e.g. after revalidation).
  useEffect(() => {
    const next = planToValues(plan);
    setBaseline(next);
    setValues(next);
  }, [plan]);

  const errors = useMemo(() => validate(values, isFree), [values, isFree]);
  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = (Object.keys(values) as (keyof FormValues)[]).some((key) => values[key] !== baseline[key]);
  const canSave = isDirty && !hasErrors && !isBusy;

  const status: PromoStatus = isFree ? "none" : getPromoStatus(values, errors);
  const base = Number(values.base_price);
  const promo = Number(values.discount_price);
  const promoApplies = status === "active" || status === "scheduled-end";
  const effectivePrice = promoApplies ? promo : base;
  const percentOff = promoApplies && base > 0 ? Math.round(((base - promo) / base) * 100) : 0;
  const featureCount = parseFeatures(values.features).length;
  const showPrice = !errors.base_price && values.base_price.trim() !== "";

  const update = (key: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setValues((prev) => ({ ...prev, [key]: e.target.value }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;

    const formData = new FormData(e.currentTarget);
    // Send a timezone-safe timestamp instead of a bare local datetime string.
    formData.set(
      "discount_end_date",
      values.discount_end_date ? new Date(values.discount_end_date).toISOString() : "",
    );
    if (isFree) {
      formData.set("base_price", "0");
      formData.set("discount_price", "");
      formData.set("discount_end_date", "");
    }
    formData.set("description", values.description.trim());
    formData.set("features", parseFeatures(values.features).join("\n"));

    onSave(plan.id, formData, () => setBaseline(values));
  }

  const inputClass = (key: keyof FormValues) => `${INPUT_CLASS} ${errors[key] ? INPUT_ERROR_CLASS : ""}`;
  const describedBy = (key: keyof FormValues) => (errors[key] ? `${plan.id}-${key}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className={`${CARD_CLASS} shadow-xl space-y-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-brand-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-lg capitalize">{plan.name}</h3>
          {isFree && (
            <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">Free tier</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
          )}
          {!isFree && <PromoBadge status={status} />}
        </div>
      </div>

      {/* Live summary */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 px-4 py-3">
        {isFree ? (
          <>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">Free</span>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {featureCount} {featureCount === 1 ? "feature" : "features"}
            </span>
          </>
        ) : showPrice ? (
          <>
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {peso.format(effectivePrice)}
            </span>
            {promoApplies && (
              <>
                <span className="text-sm text-slate-400 line-through tabular-nums">{peso.format(base)}</span>
                {percentOff > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {percentOff}% off
                  </span>
                )}
              </>
            )}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {featureCount} {featureCount === 1 ? "feature" : "features"}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">Enter a base price to preview this plan.</span>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <input type="hidden" name="id" value={plan.id} />

        {!isFree && (
          <>
        <Field
          label="Base price (₱)"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          htmlFor={`${plan.id}-base_price`}
          error={errors.base_price}
        >
          <input
            id={`${plan.id}-base_price`}
            type="number"
            name="base_price"
            min={0}
            step="any"
            inputMode="decimal"
            value={values.base_price}
            onChange={update("base_price")}
            aria-invalid={!!errors.base_price}
            aria-describedby={describedBy("base_price")}
            className={inputClass("base_price")}
          />
        </Field>

        <Field
          label="Promo price (₱)"
          icon={<Tag className="w-3.5 h-3.5" />}
          htmlFor={`${plan.id}-discount_price`}
          error={errors.discount_price}
        >
          <input
            id={`${plan.id}-discount_price`}
            type="number"
            name="discount_price"
            min={0}
            step="any"
            inputMode="decimal"
            value={values.discount_price}
            onChange={update("discount_price")}
            placeholder="No active promo"
            aria-invalid={!!errors.discount_price}
            aria-describedby={describedBy("discount_price")}
            className={inputClass("discount_price")}
          />
        </Field>

        <Field
          label="Promo end date"
          icon={<CalendarClock className="w-3.5 h-3.5" />}
          htmlFor={`${plan.id}-discount_end_date`}
          hint="Your local time"
          error={errors.discount_end_date}
        >
          <input
            id={`${plan.id}-discount_end_date`}
            type="datetime-local"
            name="discount_end_date"
            value={values.discount_end_date}
            onChange={update("discount_end_date")}
            aria-invalid={!!errors.discount_end_date}
            aria-describedby={describedBy("discount_end_date")}
            className={inputClass("discount_end_date")}
          />
        </Field>
          </>
        )}

        <div className="md:col-span-3">
          <Field
            label="Short description"
            icon={<TextQuote className="w-3.5 h-3.5" />}
            htmlFor={`${plan.id}-description`}
            hint={`${values.description.length}/${DESCRIPTION_MAX}`}
            error={errors.description}
          >
            <input
              id={`${plan.id}-description`}
              type="text"
              name="description"
              value={values.description}
              onChange={update("description")}
              placeholder="e.g. One-time upgrade for professionals"
              aria-invalid={!!errors.description}
              aria-describedby={describedBy("description")}
              className={inputClass("description")}
            />
          </Field>
        </div>

        <div className="md:col-span-3">
          <Field
            label="Features"
            icon={<ListChecks className="w-3.5 h-3.5" />}
            htmlFor={`${plan.id}-features`}
            hint="One feature per line"
            error={errors.features}
          >
            <textarea
              id={`${plan.id}-features`}
              name="features"
              rows={5}
              value={values.features}
              onChange={update("features")}
              placeholder={"Everything in Free\nUp to 10 social links\nNFC card tap integration"}
              aria-invalid={!!errors.features}
              aria-describedby={describedBy("features")}
              className={`${inputClass("features")} resize-y leading-relaxed`}
            />
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setValues(baseline)}
            disabled={!isDirty || isBusy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Discard changes
          </button>
          {!isFree && (values.discount_price || values.discount_end_date) && (
            <button
              type="button"
              onClick={() => setValues((prev) => ({ ...prev, discount_price: "", discount_end_date: "" }))}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              <X className="w-3.5 h-3.5" /> Clear promo
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Manager                                                                    */
/* -------------------------------------------------------------------------- */

export function PricingManager({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter(); 
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), feedback.type === "success" ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [feedback]);

  function handleSave(planId: string, formData: FormData, onSuccess: () => void) {
    if (isPending) return;

    setSavingId(planId);
    setFeedback(null);

    startTransition(async () => {
      try {
        await updatePricing(formData);
        onSuccess();
        setFeedback({ type: "success", message: "Pricing updated." });
        
        router.refresh(); 
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : "Couldn't update pricing. Try again.";
        setFeedback({ type: "error", message });
      } finally {
        setSavingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="sticky top-4 z-30">
          <div className="rounded-xl bg-white dark:bg-dark-900 shadow-lg">
            <div
              role={feedback.type === "error" ? "alert" : "status"}
              className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 border ${
                feedback.type === "error"
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {initialPlans?.length ? (
        <div className="grid gap-6">
          {initialPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSaving={savingId === plan.id}
              isBusy={isPending}
              onSave={handleSave}
            />
          ))}
        </div>
      ) : (
        <div className={`${CARD_CLASS} text-center text-sm text-slate-500 dark:text-slate-400`}>
          No pricing plans found. Add a plan in the database to manage it here.
        </div>
      )}
    </div>
  );
}