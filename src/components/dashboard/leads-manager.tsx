"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
  Calendar,
  CheckCircle2,
  EyeOff,
  AlertCircle,
  X,
  Search,
  Download,
  Users,
  Clock,
  Loader2,
  ClipboardList,
} from "lucide-react";
import {
  toggleLeadCaptureForm,
  deleteLead,
} from "@/app/dashboard/leads/actions";

export type Lead = {
  id: string;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_email: string | null;
  message: string | null;
  created_at: string;
};

interface LeadsManagerProps {
  initialLeads: Lead[];
  showLeadForm: boolean;
  /** Server timestamp (ms), so "last 7 days" is the same on server and client */
  serverNow: number;
}

type SortOrder = "newest" | "oldest";
type BusyAction = "toggle" | "delete" | null;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STAT_TONES = {
  brand: "bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300",
  amber: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300",
  blue: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300",
};

// Shared with the search box and the sort select so they always look the same
const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900";

const SECTION_CARD =
  "glass-card rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900";

/* ---------------- Helpers ---------------- */

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

// Keep only digits and "+" so the link can't carry anything unexpected
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function smsHref(phone: string): string {
  return `sms:${phone.replace(/[^\d+]/g, "")}`;
}

function mailHref(email: string): string {
  return `mailto:${encodeURIComponent(email.trim()).replace(/%40/g, "@")}`;
}

// CSV cell with quoting, plus protection against spreadsheet formula injection.
// Phone-like values (e.g. +63917...) are left untouched.
function csvCell(value: string | null | undefined): string {
  let text = (value ?? "").toString();
  if (/^[=@\t\r]/.test(text) || /^[+-](?![\d\s()-]*$)/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className="p-5 rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-md shadow-slate-200/70 dark:shadow-none flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${STAT_TONES[tone]}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {label}
        </p>
        <p className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Component ---------------- */

export function LeadsManager({
  initialLeads,
  showLeadForm,
  serverNow,
}: LeadsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Which action is running, so a delete doesn't spin the toggle button (and vice versa)
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [formEnabled, setFormEnabled] = useState(showLeadForm);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isBusy = isPending || busyAction !== null;

  // Keep local state in sync when the server re-sends fresh data (after router.refresh())
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setFormEnabled(showLeadForm);
  }, [showLeadForm]);

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  // Escape cancels a pending delete confirmation
  useEffect(() => {
    if (!confirmDeleteId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmDeleteId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDeleteId]);

  const stats = useMemo(() => {
    const weekAgo = serverNow - WEEK_MS;
    return {
      total: leads.length,
      lastWeek: leads.filter((l) => new Date(l.created_at).getTime() >= weekAgo)
        .length,
      withPhone: leads.filter((l) => !!l.visitor_phone).length,
    };
  }, [leads, serverNow]);

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? leads.filter((lead) =>
          [
            lead.visitor_name,
            lead.visitor_phone,
            lead.visitor_email,
            lead.message,
          ].some((field) => field?.toLowerCase().includes(q))
        )
      : leads;

    return [...filtered].sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "newest" ? -diff : diff;
    });
  }, [leads, query, sort]);

  /* ---------------- Handlers ---------------- */

  function handleToggle() {
    if (isBusy) return; // ignore double clicks while a request is running
    setFeedback(null);
    const previous = formEnabled;
    const next = !previous;
    setFormEnabled(next);
    setBusyAction("toggle");

    const formData = new FormData();
    formData.append("show_lead_form", next.toString());

    startTransition(async () => {
      try {
        const res = (await toggleLeadCaptureForm(formData)) as unknown as
          | { error?: string }
          | undefined;

        if (res?.error) {
          setFormEnabled(previous);
          setFeedback({ type: "error", message: res.error });
          return;
        }

        setFeedback({
          type: "success",
          message: next
            ? "Lead form is now visible on your public card."
            : "Lead form is now hidden from your public card.",
        });
        router.refresh();
      } catch {
        setFormEnabled(previous);
        setFeedback({
          type: "error",
          message: "Could not update the lead form. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (isBusy) return;
    setFeedback(null);
    setConfirmDeleteId(null);
    setBusyAction("delete");

    // Optimistic update, with a snapshot so we can roll back on failure
    const previous = leads;
    setLeads((prev) => prev.filter((lead) => lead.id !== id));

    const formData = new FormData();
    formData.append("lead_id", id);

    startTransition(async () => {
      try {
        const res = (await deleteLead(formData)) as unknown as
          | { error?: string }
          | undefined;

        if (res?.error) {
          setLeads(previous);
          setFeedback({ type: "error", message: res.error });
          return;
        }

        setFeedback({ type: "success", message: "Lead deleted." });
        router.refresh();
      } catch {
        setLeads(previous);
        setFeedback({
          type: "error",
          message: "Could not delete the lead. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleExport() {
    if (visibleLeads.length === 0) return;

    const header = ["Name", "Phone", "Email", "Message", "Date"];
    const rows = visibleLeads.map((lead) => [
      lead.visitor_name,
      lead.visitor_phone,
      lead.visitor_email,
      lead.message,
      new Date(lead.created_at).toISOString(),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    // BOM so Excel opens UTF-8 (e.g. names with accents) correctly
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `konektap-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Release the blob after the download has started (revoking immediately can cancel it in some browsers)
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setFeedback({
      type: "success",
      message: `Exported ${visibleLeads.length} ${
        visibleLeads.length === 1 ? "lead" : "leads"
      } to CSV.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Sticky so feedback is visible even when the list is long and the user has scrolled */}
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
                className={`p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer ${FOCUS_RING}`}
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD FORM TOGGLE */}
      <div
        className={`${SECTION_CARD} flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6`}
      >
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-500" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Lead Capture Form
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formEnabled
              ? "Visitors can share their contact info from your public card."
              : "The form is hidden. Visitors can't send you their details."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isBusy}
          aria-pressed={formEnabled}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${FOCUS_RING} ${
            formEnabled
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
              : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-transparent hover:bg-slate-300 dark:hover:bg-white/20"
          }`}
        >
          {busyAction === "toggle" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : formEnabled ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          {busyAction === "toggle"
            ? "Updating..."
            : formEnabled
              ? "Form Active on Profile"
              : "Form Hidden (Click to Enable)"}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Leads" value={stats.total} tone="brand" />
        <StatCard icon={Clock} label="Last 7 Days" value={stats.lastWeek} tone="amber" />
        <StatCard icon={Phone} label="With Phone Number" value={stats.withPhone} tone="blue" />
      </div>

      {leads.length === 0 ? (
        /* EMPTY STATE */
        <div className={`${SECTION_CARD} p-12 text-center`}>
          <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No leads yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            When someone fills out the "Share Your Contact Info" form on your
            public card, they'll show up here right away.
          </p>
        </div>
      ) : (
        <>
          {/* TOOLBAR: SEARCH, SORT, EXPORT */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="leads-search" className="sr-only">
                Search leads
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="leads-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, email, or message..."
                autoComplete="off"
                spellCheck={false}
                className={`${INPUT_CLASS} pl-10 pr-10`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer ${FOCUS_RING}`}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <label htmlFor="leads-sort" className="sr-only">
                Sort leads
              </label>
              <select
                id="leads-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                className={`${INPUT_CLASS} sm:w-auto cursor-pointer`}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={visibleLeads.length === 0}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {query.trim() && (
            <p
              className="text-xs text-slate-500 dark:text-slate-400 px-1"
              role="status"
            >
              Showing {visibleLeads.length} of {leads.length} leads
            </p>
          )}

          {/* LEADS LIST */}
          {visibleLeads.length === 0 ? (
            <div className={`${SECTION_CARD} p-10 text-center`}>
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No leads match your search
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className={`mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer rounded ${FOCUS_RING}`}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleLeads.map((lead) => {
                const isConfirmingDelete = confirmDeleteId === lead.id;
                const initial =
                  lead.visitor_name?.trim().charAt(0).toUpperCase() || "?";

                return (
                  <div
                    key={lead.id}
                    className={`${SECTION_CARD} p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
                  >
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shrink-0"
                        aria-hidden="true"
                      >
                        {initial}
                      </div>

                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white break-words">
                            {lead.visitor_name}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-400"
                            suppressHydrationWarning
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateTime(lead.created_at)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          {lead.visitor_phone && (
                            <>
                              <a
                                href={telHref(lead.visitor_phone)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-brand-500 transition ${FOCUS_RING}`}
                              >
                                <Phone className="w-3.5 h-3.5 text-brand-500" />
                                {lead.visitor_phone}
                              </a>
                              <a
                                href={smsHref(lead.visitor_phone)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition ${FOCUS_RING}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Send SMS
                              </a>
                            </>
                          )}
                          {lead.visitor_email && (
                            <a
                              href={mailHref(lead.visitor_email)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-brand-500 transition break-all ${FOCUS_RING}`}
                            >
                              <Mail className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                              {lead.visitor_email}
                            </a>
                          )}
                        </div>

                        {lead.message && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/60 dark:border-white/5 whitespace-pre-wrap break-words">
                            {`“${lead.message}”`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                      {isConfirmingDelete ? (
                        <>
                          <span
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1"
                            role="alert"
                          >
                            Delete this lead?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(lead.id)}
                            disabled={isBusy}
                            autoFocus
                            className={`px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(lead.id)}
                          disabled={isBusy}
                          className={`p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
                          title="Delete lead"
                          aria-label={`Delete lead from ${lead.visitor_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}