"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaGithub,
  FaLinkedin,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import {
  addLink,
  deleteLink,
  updateLinkOrder,
} from "@/app/dashboard/links/actions";

type LinkItem = {
  id: string;
  title: string;
  url: string;
  platform: string;
  position: number;
};

interface LinksManagerProps {
  initialLinks: LinkItem[];
  /** Optional plan limit (e.g. TIER_CONFIG[tier].maxSocialLinks). Enforce it on the server too. */
  maxLinks?: number;
}

const PLATFORMS = [
  { id: "website", name: "Website", icon: Globe, placeholder: "e.g. My Portfolio" },
  { id: "facebook", name: "Facebook", icon: FaFacebook, placeholder: "e.g. My Facebook Page" },
  { id: "instagram", name: "Instagram", icon: FaInstagram, placeholder: "e.g. @myhandle" },
  { id: "linkedin", name: "LinkedIn", icon: FaLinkedin, placeholder: "e.g. Connect with me" },
  { id: "github", name: "GitHub", icon: FaGithub, placeholder: "e.g. My Code" },
  { id: "twitter", name: "Twitter / X", icon: FaXTwitter, placeholder: "e.g. @myhandle" },
  { id: "youtube", name: "YouTube", icon: FaYoutube, placeholder: "e.g. My Channel" },
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition";

// Only plain http(s) links are allowed (blocks javascript:, data:, etc.)
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function LinksManager({ initialLinks, maxLinks }: LinksManagerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [platform, setPlatform] = useState("website");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isAtLimit = typeof maxLinks === "number" && links.length >= maxLinks;
  const currentPlatform =
    PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  // Prevent hydration mismatch with drag-and-drop library
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keep local list in sync when the server re-sends fresh data (after router.refresh())
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  function handleAddLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    if (isAtLimit) {
      setFeedback({
        type: "error",
        message: `You've reached your plan limit of ${maxLinks} links. Upgrade to add more.`,
      });
      return;
    }

    const formData = new FormData(e.currentTarget);

    const url = String(formData.get("url") || "").trim();
    if (!isSafeHttpUrl(url)) {
      setFeedback({
        type: "error",
        message: "URL must start with http:// or https://",
      });
      return;
    }
    formData.set("url", url);
    formData.append("position", links.length.toString());

    startTransition(async () => {
      const result = await addLink(formData);

      if (result?.error) {
        // The form keeps what the user typed, so nothing is lost on error
        setFeedback({ type: "error", message: result.error });
        return;
      }

      formRef.current?.reset();
      setPlatform("website");
      setFeedback({ type: "success", message: "Link added successfully!" });
      router.refresh();
    });
  }

  function handleDeleteLink(id: string) {
    setFeedback(null);
    setConfirmDeleteId(null);

    // Optimistic update, with a snapshot so we can roll back on failure
    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));

    startTransition(async () => {
      try {
        const res = (await deleteLink(id)) as unknown as
          | { error?: string }
          | undefined;

        if (res?.error) {
          setLinks(previous);
          setFeedback({ type: "error", message: res.error });
        }
      } catch {
        setLinks(previous);
        setFeedback({
          type: "error",
          message: "Could not delete the link. Please try again.",
        });
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const previous = links;
    const items = Array.from(links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    setLinks(updatedItems);

    startTransition(async () => {
      try {
        const res = (await updateLinkOrder(
          updatedItems.map((item) => ({ id: item.id, position: item.position }))
        )) as unknown as { error?: string } | undefined;

        if (res?.error) {
          setLinks(previous);
          setFeedback({ type: "error", message: res.error });
        }
      } catch {
        setLinks(previous);
        setFeedback({
          type: "error",
          message: "Could not save the new order. Please try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* STATUS FEEDBACK BANNER */}
      {feedback && (
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
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ADD NEW LINK FORM */}
      <form
        ref={formRef}
        onSubmit={handleAddLink}
        className="glass-card p-6 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-white/10"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Add New Link
          </h3>
          {typeof maxLinks === "number" && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isAtLimit
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent"
              }`}
            >
              {links.length} / {maxLinks} links
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Platform
            </label>
            <select
              name="platform"
              required
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              name="title"
              required
              maxLength={60}
              placeholder={currentPlatform.placeholder}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              URL
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://"
              className={inputClass}
            />
          </div>
        </div>

        {isAtLimit && (
          <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            You've reached your plan limit. Remove a link or upgrade to add more.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isAtLimit}
          className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isPending ? "Working..." : "Add Link"}
        </button>
      </form>

      {/* DRAG AND DROP LIST */}
      <div className="space-y-2">
        {links.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Links ({links.length})
            </h3>
            <span className="text-[11px] text-slate-400">Drag to reorder</span>
          </div>
        )}

        {!isMounted ? (
          <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="links-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {links.length === 0 && (
                    <p className="text-sm text-center text-slate-500 py-8">
                      No links added yet. Add your first link above.
                    </p>
                  )}

                  {links.map((link, index) => {
                    const Icon =
                      PLATFORMS.find((p) => p.id === link.platform)?.icon ||
                      Globe;
                    const isConfirmingDelete = confirmDeleteId === link.id;

                    return (
                      <Draggable
                        key={link.id}
                        draggableId={link.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-4 p-4 bg-white dark:bg-dark-900 rounded-2xl border ${
                              snapshot.isDragging
                                ? "border-brand-500 shadow-2xl scale-[1.02]"
                                : "border-slate-200 dark:border-white/10 shadow-sm"
                            } transition-all`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-slate-400 hover:text-brand-500 cursor-grab active:cursor-grabbing shrink-0"
                              aria-label="Drag to reorder"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>

                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {link.title}
                              </p>
                              {isSafeHttpUrl(link.url) ? (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-slate-500 hover:text-brand-500 hover:underline truncate transition-colors"
                                >
                                  {link.url}
                                </a>
                              ) : (
                                <p className="text-xs text-slate-500 truncate">
                                  {link.url}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isConfirmingDelete ? (
                                <>
                                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1">
                                    Delete?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLink(link.id)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                  >
                                    No
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(link.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Link"
                                  aria-label="Delete link"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}