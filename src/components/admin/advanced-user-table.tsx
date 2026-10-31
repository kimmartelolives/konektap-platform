"use client";

import { useState, useTransition, useMemo, useEffect, type ReactNode } from "react";
import {
  bulkUpdateTier,
  updateUserDetails,
  deleteUserRecord,
} from "@/app/admin-soniry-hq-x8y9z2026/actions";
import {
  ShieldAlert,
  Calendar,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";

type AdvancedUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  tier: string | null;
  role: string | null;
  created_at: string;
};

type ActionResult = { error?: string | null } | void | undefined;
type Notice = { type: "success" | "error"; text: string } | null;
type TierFilter = "all" | "demo" | "standard" | "premium";
type SortOrder = "newest" | "oldest";
type ConfirmState = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone: "danger" | "brand";
  onConfirm: () => void;
} | null;

// "demo" is how the database stores the Free tier
const TIER_META: Record<string, { label: string; badge: string }> = {
  demo: {
    label: "Free",
    badge:
      "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10",
  },
  standard: {
    label: "Standard",
    badge:
      "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/20",
  },
  premium: {
    label: "Premium",
    badge:
      "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
};

const TIER_FILTERS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "demo", label: "Free" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

const PAGE_SIZES = [10, 25, 50] as const;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900";
const CARD_BASE =
  "glass-card rounded-3xl shadow-sm bg-white dark:bg-dark-900";
const SECTION_CARD = `${CARD_BASE} border border-slate-200 dark:border-white/10`;
const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs text-slate-900 dark:text-white outline-none transition-colors";
const TOOLBAR_INPUT =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

function normTier(tier: string | null | undefined): string {
  return !tier || tier === "free" ? "demo" : tier;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

function ConfirmDialog({
  state,
  busy,
  onCancel,
}: {
  state: NonNullable<ConfirmState>;
  busy: boolean;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const danger = state.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className={`${SECTION_CARD} w-full max-w-sm p-6 space-y-4 text-center`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            danger
              ? "bg-rose-100 dark:bg-rose-500/15 text-rose-500"
              : "bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300"
          }`}
          aria-hidden="true"
        >
          {danger ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <h2
          id="confirm-title"
          className="font-bold text-lg text-slate-900 dark:text-white"
        >
          {state.title}
        </h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {state.message}
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer ${FOCUS_RING}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={state.onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50 ${FOCUS_RING} ${
              danger
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-brand-600 hover:bg-brand-500"
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdvancedUserTable({ users }: { users: AdvancedUser[] }) {
  const [isPending, startTransition] = useTransition();

  // View state
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection, dialogs, feedback
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editTier, setEditTier] = useState("demo");
  const [editError, setEditError] = useState<string | null>(null);

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // Drop selections for users that no longer exist (deleted / refreshed)
  useEffect(() => {
    setSelectedIds((prev) => {
      const ids = new Set(users.map((u) => u.id));
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [users]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const tier: Record<TierFilter, number> = {
      all: users.length,
      demo: 0,
      standard: 0,
      premium: 0,
    };
    for (const u of users) {
      const t = normTier(u.tier) as TierFilter;
      if (t in tier) tier[t] += 1;
    }
    return { tier };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const t = normTier(u.tier);
        if (tierFilter !== "all" && t !== tierFilter) return false;
        if (!q) return true;
        return [u.full_name, u.username, TIER_META[t]?.label, u.role].some(
          (f) => f?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const diff =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sort === "newest" ? -diff : diff;
      });
  }, [users, query, tierFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + pageSize);
  const rangeStart = filteredUsers.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, filteredUsers.length);
  const isFiltering = query.trim() !== "" || tierFilter !== "all";

  const selectedOnPage = currentUsers.filter((u) => selectedIds.has(u.id)).length;
  const allOnPageSelected =
    currentUsers.length > 0 && selectedOnPage === currentUsers.length;

  // Any change to the view resets the page and clears selection,
  // so bulk actions never hit rows the admin can't see
  function changeView(update: () => void) {
    update();
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  function resetFilters() {
    changeView(() => {
      setQuery("");
      setTierFilter("all");
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) currentUsers.forEach((u) => next.delete(u.id));
      else currentUsers.forEach((u) => next.add(u.id));
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Shared runner: handles errors thrown OR returned by the server actions
  function runAction(
    action: () => Promise<unknown>,
    successText: string,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      try {
        const res = (await action()) as ActionResult;
        if (res && typeof res === "object" && res.error) {
          setNotice({ type: "error", text: res.error });
          return;
        }
        setNotice({ type: "success", text: successText });
        onSuccess?.();
      } catch (error) {
        console.error("[admin] action failed:", error);
        setNotice({ type: "error", text: "Something went wrong. Try again." });
      }
    });
  }

  function requestBulkTier(tier: string) {
    if (!tier || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const label = TIER_META[tier]?.label ?? tier;
    setConfirm({
      title: `Change ${ids.length} ${ids.length === 1 ? "user" : "users"} to ${label}?`,
      message: "Their tier changes right away. You can change it back at any time.",
      confirmLabel: "Change tier",
      tone: "brand",
      onConfirm: () => {
        setConfirm(null);
        runAction(
          () => bulkUpdateTier(ids, tier),
          `Updated ${ids.length} ${ids.length === 1 ? "user" : "users"} to ${label}.`,
          () => setSelectedIds(new Set())
        );
      },
    });
  }

  function requestDelete(user: AdvancedUser) {
    const name = user.full_name || user.username || "this user";
    setConfirm({
      title: "Delete account?",
      message: (
        <>
          This permanently deletes <b>{name}</b>&apos;s profile data. This
          can&apos;t be undone.
        </>
      ),
      confirmLabel: "Yes, delete",
      tone: "danger",
      onConfirm: () => {
        setConfirm(null);
        runAction(() => deleteUserRecord(user.id), `${name} was deleted.`);
      },
    });
  }

  function startEdit(user: AdvancedUser) {
    setEditingId(user.id);
    setEditFullName(user.full_name || "");
    setEditUsername(user.username || "");
    setEditTier(normTier(user.tier));
    setEditError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function saveEdit(user: AdvancedUser) {
    const fullName = editFullName.trim();
    const username = editUsername.trim();

    if (!fullName) {
      setEditError("Full name is required.");
      return;
    }
    if (!USERNAME_RE.test(username)) {
      setEditError(
        "Username must be 3–30 characters: letters, numbers, dots, dashes, or underscores."
      );
      return;
    }
    setEditError(null);

    const detailsChanged =
      fullName !== (user.full_name || "") || username !== (user.username || "");
    const tierChanged = editTier !== normTier(user.tier);

    // Nothing changed: just close the editor
    if (!detailsChanged && !tierChanged) {
      setEditingId(null);
      return;
    }

    runAction(
      async () => {
        if (detailsChanged) {
          const res = (await updateUserDetails(user.id, {
            full_name: fullName,
            username,
          })) as ActionResult;
          if (res && typeof res === "object" && res.error) return res;
        }
        if (tierChanged) {
          return await bulkUpdateTier([user.id], editTier);
        }
      },
      "User profile updated.",
      () => setEditingId(null)
    );
  }

  return (
    <div className="space-y-5">
      {/* TOOLBAR: bulk bar replaces search while rows are selected */}
      {selectedIds.size > 0 ? (
        <div className="sticky top-2 z-20 flex flex-col sm:flex-row sm:items-center gap-3 bg-brand-50/95 dark:bg-brand-500/15 backdrop-blur px-4 py-2.5 rounded-xl border border-brand-200 dark:border-brand-500/25">
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="bulk-tier" className="sr-only">
              Change tier for selected users
            </label>
            <select
              id="bulk-tier"
              disabled={isPending}
              value=""
              onChange={(e) => requestBulkTier(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-dark-950 border border-brand-200 dark:border-brand-500/25 text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
            >
              <option value="">Change tier to...</option>
              <option value="demo">Free</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className={`p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg cursor-pointer ${FOCUS_RING}`}
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="adv-user-search" className="sr-only">
              Search users
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="adv-user-search"
              type="search"
              value={query}
              onChange={(e) => changeView(() => setQuery(e.target.value))}
              placeholder="Search name, username, tier, or role..."
              autoComplete="off"
              spellCheck={false}
              className={`${TOOLBAR_INPUT} pl-10 pr-10`}
            />
            {query && (
              <button
                type="button"
                onClick={() => changeView(() => setQuery(""))}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ${FOCUS_RING}`}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <label htmlFor="adv-user-sort" className="sr-only">
              Sort users
            </label>
            <select
              id="adv-user-sort"
              value={sort}
              onChange={(e) => changeView(() => setSort(e.target.value as SortOrder))}
              className={`${TOOLBAR_INPUT} sm:w-auto cursor-pointer`}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      )}

      {/* FILTER CHIPS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tier">
          {TIER_FILTERS.map((f) => {
            const active = tierFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => changeView(() => setTierFilter(f.value))}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${FOCUS_RING} ${
                  active
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                {f.label}
                <span className={`tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>
                  {counts.tier[f.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* NOTICE */}
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 border ${
            notice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
              : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {notice.text}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={`p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer ${FOCUS_RING}`}
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isFiltering && (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1" role="status">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      )}

      {/* USER LIST */}
      {filteredUsers.length === 0 ? (
        <div className={`${SECTION_CARD} p-10 text-center`}>
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {users.length === 0 ? "No users yet" : "No users match your filters"}
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={resetFilters}
              className={`mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer rounded ${FOCUS_RING}`}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center px-5 py-1">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`mr-3 text-slate-400 hover:text-brand-500 cursor-pointer rounded ${FOCUS_RING}`}
              aria-label={allOnPageSelected ? "Deselect all on this page" : "Select all on this page"}
            >
              {allOnPageSelected ? (
                <CheckSquare className="w-5 h-5 text-brand-500" />
              ) : selectedOnPage > 0 ? (
                <MinusSquare className="w-5 h-5 text-brand-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Select all on this page
            </span>
          </div>

          <ul className="space-y-3">
            {currentUsers.map((user) => {
              const isSelected = selectedIds.has(user.id);
              const isEditing = editingId === user.id;
              const isAdmin = user.role === "admin";
              const tierKey = normTier(user.tier);
              const tierMeta = TIER_META[tierKey] ?? {
                label: tierKey,
                badge: TIER_META.demo.badge,
              };
              const displayName = user.full_name?.trim() || user.username?.trim() || "?";

              return (
                <li
                  key={user.id}
                  className={`${CARD_BASE} border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-shadow ${
                    "border-slate-200 dark:border-white/10"
                  } ${isSelected ? "ring-2 ring-brand-500" : ""}`}
                >
                  <div className="flex gap-4 items-center min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSelect(user.id)}
                      className={`text-slate-400 hover:text-brand-500 cursor-pointer rounded ${FOCUS_RING}`}
                      aria-label={`${isSelected ? "Deselect" : "Select"} ${displayName}`}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-brand-500" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      aria-hidden="true"
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div
                          className="space-y-2 pr-2"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                              e.preventDefault();
                              saveEdit(user);
                            }
                          }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              placeholder="Full name"
                              aria-label="Full name"
                              autoFocus
                              className={INPUT_CLASS}
                            />
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              placeholder="Username"
                              aria-label="Username"
                              autoCapitalize="none"
                              spellCheck={false}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <select
                            value={editTier}
                            onChange={(e) => setEditTier(e.target.value)}
                            aria-label="Tier"
                            className={`${INPUT_CLASS} cursor-pointer`}
                          >
                            <option value="demo">Free Tier</option>
                            <option value="standard">Standard Tier</option>
                            <option value="premium">Premium Tier</option>
                          </select>
                          {editError && (
                            <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                              {editError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className="font-bold text-sm break-words text-slate-900 dark:text-white"
                            >
                              {user.full_name || "Unnamed User"}
                            </h3>
                            {isAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full font-bold border border-rose-200 dark:border-rose-500/20">
                                <ShieldAlert className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              @{user.username || "setup_pending"}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 text-xs text-slate-400"
                              suppressHydrationWarning
                            >
                              <Calendar className="w-3 h-3" />
                              {formatDate(user.created_at)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {!isEditing && (
                      <span
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${tierMeta.badge}`}
                      >
                        {tierMeta.label}
                      </span>
                    )}

                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(user)}
                            disabled={isPending}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className={`p-2 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
                            title="Edit user"
                            aria-label={`Edit ${displayName}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(user)}
                            disabled={isAdmin}
                            className={`p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 ${FOCUS_RING}`}
                            title={isAdmin ? "Admin accounts can't be deleted here" : "Delete user"}
                            aria-label={`Delete ${displayName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* PAGINATION */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of {filteredUsers.length}
            </p>
            <label htmlFor="adv-page-size" className="sr-only">
              Users per page
            </label>
            <select
              id="adv-page-size"
              value={pageSize}
              onChange={(e) => changeView(() => setPageSize(Number(e.target.value)))}
              className={`px-2.5 py-1 rounded-lg bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 cursor-pointer ${FOCUS_RING}`}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
                className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer ${FOCUS_RING}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageItems(safePage, totalPages).map((item, i) =>
                item === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === safePage ? "page" : undefined}
                    className={`min-w-9 h-9 px-2 rounded-xl text-xs font-semibold tabular-nums transition cursor-pointer ${FOCUS_RING} ${
                      item === safePage
                        ? "bg-brand-500 text-white"
                        : "border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
                className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer ${FOCUS_RING}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </div>
      )}

      {/* CONFIRM DIALOG (delete + bulk tier change) */}
      {confirm && (
        <ConfirmDialog
          state={confirm}
          busy={isPending}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}