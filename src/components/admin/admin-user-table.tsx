"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { updateUserTier } from "@/app/admin-soniry-hq-x8y9z2026/actions";
import {
  ShieldAlert,
  Calendar,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type AdminUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  tier: string | null;
  role: string | null;
  created_at: string;
};

type SortOrder = "newest" | "oldest";
// BINAGO: Pinalitan ang "free" ng "demo" para tumugma sa database constraint
type TierFilter = "all" | "demo" | "standard" | "premium";
type Notice = { type: "success" | "error"; text: string } | null;

const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900";
const SECTION_CARD =
  "glass-card rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

// BINAGO: Ginamit ang "demo" bilang pinakamababang tier
const TIER_RANK: Record<string, number> = { demo: 0, standard: 1, premium: 2 };
const TIER_LABEL: Record<string, string> = {
  demo: "Free Tier",
  standard: "Standard",
  premium: "Premium",
};
const TIER_FILTERS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "demo", label: "Free" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
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

export function AdminUserTable({ users }: { users: AdminUser[] }) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [tierOverrides, setTierOverrides] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<{
    user: AdminUser;
    newTier: string;
  } | null>(null);

  useEffect(() => {
    setTierOverrides({});
  }, [users]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!pendingDowngrade) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingDowngrade(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDowngrade]);

  // BINAGO: Fallback tier ay "demo" na
  const getTier = (u: AdminUser) => tierOverrides[u.id] ?? u.tier ?? "demo";

  const tierCounts = useMemo(() => {
    const counts: Record<TierFilter, number> = {
      all: users.length,
      demo: 0,
      standard: 0,
      premium: 0,
    };
    for (const u of users) {
      const t = (tierOverrides[u.id] ?? u.tier ?? "demo") as TierFilter;
      if (t in counts) counts[t] += 1;
    }
    return counts;
  }, [users, tierOverrides]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = users.filter((u) => {
      const tier = tierOverrides[u.id] ?? u.tier ?? "demo";
      if (tierFilter !== "all" && tier !== tierFilter) return false;
      if (!q) return true;
      return [u.full_name, u.username, tier, u.role].some((field) =>
        field?.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "newest" ? -diff : diff;
    });
  }, [users, query, sort, tierFilter, tierOverrides]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + pageSize);
  const rangeStart = filteredUsers.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, filteredUsers.length);

  const isFiltering = query.trim() !== "" || tierFilter !== "all";

  const handleSearchChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const handleTierFilter = (val: TierFilter) => {
    setTierFilter(val);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setTierFilter("all");
    setCurrentPage(1);
  };

  function requestTierChange(user: AdminUser, newTier: string) {
    const previousTier = getTier(user);
    if (newTier === previousTier) return;

    if ((TIER_RANK[newTier] ?? 0) < (TIER_RANK[previousTier] ?? 0)) {
      setPendingDowngrade({ user, newTier });
      return;
    }
    applyTierChange(user, newTier);
  }

  function applyTierChange(user: AdminUser, newTier: string) {
    const name = user.full_name || user.username || "this user";

    setUpdatingId(user.id);
    setTierOverrides((prev) => ({ ...prev, [user.id]: newTier }));

    startTransition(async () => {
      try {
        const result = (await updateUserTier(user.id, newTier)) as
          | { error?: string | null; success?: boolean }
          | void;

        if (
          result &&
          typeof result === "object" &&
          (result.error || result.success === false)
        ) {
          throw new Error(result.error || "Update failed");
        }

        setNotice({
          type: "success",
          text: `${name} is now on ${TIER_LABEL[newTier] ?? newTier}.`,
        });
      } catch (error) {
        setTierOverrides((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
        const reason =
          error instanceof Error && error.message ? error.message : "Unknown error";
        setNotice({
          type: "error",
          text: `Couldn't update ${name}'s tier: ${reason}`,
        });
      } finally {
        setUpdatingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* TOOLBAR: SEARCH & SORT */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, username, tier, or role..."
            autoComplete="off"
            spellCheck={false}
            className={`${INPUT_CLASS} pl-10 pr-10`}
          />
          {query && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer ${FOCUS_RING}`}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <label htmlFor="user-sort" className="sr-only">
            Sort users
          </label>
          <select
            id="user-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOrder);
              setCurrentPage(1);
            }}
            className={`${INPUT_CLASS} sm:w-auto cursor-pointer`}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* TIER FILTER CHIPS */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter users by tier"
      >
        {TIER_FILTERS.map((f) => {
          const active = tierFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => handleTierFilter(f.value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${FOCUS_RING} ${
                active
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums ${
                  active ? "text-white/80" : "text-slate-400"
                }`}
              >
                {tierCounts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTION NOTICE (success / error) */}
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-medium border ${
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
            className={`p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer ${FOCUS_RING}`}
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isFiltering && (
        <p
          className="text-xs text-slate-500 dark:text-slate-400 px-1"
          role="status"
        >
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
        <ul className="grid gap-4">
          {currentUsers.map((user) => {
            const displayName =
              user.full_name?.trim() || user.username?.trim() || "?";
            const initial = displayName.charAt(0).toUpperCase();
            const tier = getTier(user);
            const rowBusy = isPending && updatingId === user.id;
            const username = user.username?.trim();

            return (
              <li
                key={user.id}
                className={`${SECTION_CARD} p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
              >
                <div className="flex gap-4 min-w-0 flex-1">
                  {/* Initial Icon Box */}
                  <div
                    className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shrink-0"
                    aria-hidden="true"
                  >
                    {initial}
                  </div>

                  <div className="space-y-2.5 min-w-0 flex-1">
                    {/* Header Row: Name & Date */}
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white break-words">
                        {user.full_name || "Unnamed User"}
                      </h3>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        @{user.username || "setup_pending"}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs text-slate-400"
                        suppressHydrationWarning
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(user.created_at)}
                      </span>
                    </div>

                    {/* Role + Tier */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-500/20">
                          <ShieldAlert className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-white/10">
                          <Users className="w-3.5 h-3.5" /> User
                        </span>
                      )}

                      {/* BINAGO: <option value="demo"> na ang free tier option */}
                      <select
                        aria-label={`Change tier for ${displayName}`}
                        disabled={rowBusy}
                        value={tier}
                        onChange={(e) => requestTierChange(user, e.target.value)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20 text-xs font-semibold outline-none focus:border-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait transition ${FOCUS_RING}`}
                      >
                        <option value="demo">Free Tier</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Top Right Action: View Profile */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                  {username ? (
                    <a
                      href={`/@${username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition cursor-pointer ${FOCUS_RING}`}
                      title="View Profile"
                      aria-label={`View profile of ${username}`}
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </a>
                  ) : (
                    <span
                      className="p-2 rounded-xl text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      title="Profile not set up yet"
                      aria-label="Profile not set up yet"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* PAGINATION CONTROLS */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-6 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of {filteredUsers.length}
            </p>
            <label htmlFor="page-size" className="sr-only">
              Users per page
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 cursor-pointer ${FOCUS_RING}`}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <nav
              className="flex items-center gap-1.5"
              aria-label="Pagination"
            >
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
                  <span
                    key={`gap-${i}`}
                    className="px-1 text-xs text-slate-400"
                    aria-hidden="true"
                  >
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
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safePage + 1))
                }
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

      {/* DOWNGRADE CONFIRMATION DIALOG */}
      {pendingDowngrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="downgrade-title"
          onClick={() => setPendingDowngrade(null)}
        >
          <div
            className={`${SECTION_CARD} w-full max-w-sm p-6 space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="downgrade-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Downgrade this user?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {pendingDowngrade.user.full_name ||
                pendingDowngrade.user.username ||
                "This user"}{" "}
              will move from{" "}
              <strong>
                {TIER_LABEL[getTier(pendingDowngrade.user)] ??
                  getTier(pendingDowngrade.user)}
              </strong>{" "}
              to{" "}
              <strong>
                {TIER_LABEL[pendingDowngrade.newTier] ?? pendingDowngrade.newTier}
              </strong>
              .
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDowngrade(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { user, newTier } = pendingDowngrade;
                  setPendingDowngrade(null);
                  applyTierChange(user, newTier);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer ${FOCUS_RING}`}
              >
                Downgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}