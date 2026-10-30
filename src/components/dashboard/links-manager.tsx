"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  X,
  Link as LinkIcon,
  Type,
  Share2,
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
import { createClient } from "@/lib/supabase/client"; // Needed for updating the specific link

type LinkItem = {
  id: string;
  title: string;
  url: string;
  platform: string;
  position: number;
};

interface LinksManagerProps {
  initialLinks: LinkItem[];
  maxLinks?: number;
}

const TITLE_MAX = 60;

const PLATFORMS = [
  { id: "website", name: "Website", icon: Globe, placeholder: "e.g. My Portfolio" },
  { id: "facebook", name: "Facebook", icon: FaFacebook, placeholder: "e.g. My Facebook Page" },
  { id: "instagram", name: "Instagram", icon: FaInstagram, placeholder: "e.g. @myhandle" },
  { id: "linkedin", name: "LinkedIn", icon: FaLinkedin, placeholder: "e.g. Connect with me" },
  { id: "github", name: "GitHub", icon: FaGithub, placeholder: "e.g. My Code" },
  { id: "twitter", name: "Twitter / X", icon: FaXTwitter, placeholder: "e.g. @myhandle" },
  { id: "youtube", name: "YouTube", icon: FaYoutube, placeholder: "e.g. My Channel" },
];

const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

const CARD_CLASS =
  "glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900";

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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

export function LinksManager({ initialLinks, maxLinks }: LinksManagerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [isAdding, startAdd] = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [platform, setPlatform] = useState("website");
  const [titleLength, setTitleLength] = useState(0);
  
  // EDIT STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isBusy = isAdding || isMutating;
  const hasLimit = typeof maxLinks === "number";
  const isAtLimit = hasLimit && links.length >= maxLinks;
  const currentPlatform = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

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
    if (isBusy) return;
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
    formData.set("title", String(formData.get("title") || "").trim());
    formData.set("position", links.length.toString());

    startAdd(async () => {
      try {
        const result = await addLink(formData);
        if (result?.error) {
          setFeedback({ type: "error", message: result.error });
          return;
        }

        formRef.current?.reset();
        setPlatform("website");
        setTitleLength(0);
        setFeedback({ type: "success", message: "Link added successfully!" });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not add the link. Please try again.",
        });
      }
    });
  }

  // START EDIT
  function handleStartEdit(link: LinkItem) {
    setEditingId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setConfirmDeleteId(null);
    setFeedback(null);
  }

  // SAVE EDIT
  function handleSaveEdit(id: string) {
    if (!editTitle.trim() || !editUrl.trim()) {
      setFeedback({ type: "error", message: "Title and URL are required." });
      return;
    }
    
    if (!isSafeHttpUrl(editUrl.trim())) {
      setFeedback({ type: "error", message: "URL must start with http:// or https://" });
      return;
    }

    const supabase = createClient();
    startMutate(async () => {
      try {
        const { error } = await supabase
          .from("social_links")
          .update({ title: editTitle.trim(), url: editUrl.trim() })
          .eq("id", id);
          
        if (error) throw error;
        
        // Optimistic update
        setLinks((prev) => 
          prev.map((l) => l.id === id ? { ...l, title: editTitle.trim(), url: editUrl.trim() } : l)
        );
        
        setEditingId(null);
        setFeedback({ type: "success", message: "Link updated successfully!" });
        router.refresh();
      } catch (err) {
        setFeedback({ type: "error", message: "Failed to update link. Please try again." });
      }
    });
  }

  function handleDeleteLink(id: string) {
    if (isBusy) return;
    setFeedback(null);
    setConfirmDeleteId(null);

    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));

    startMutate(async () => {
      try {
        const res = (await deleteLink(id)) as unknown as { error?: string } | undefined;
        if (res?.error) {
          setLinks(previous);
          setFeedback({ type: "error", message: res.error });
          return;
        }
        setFeedback({ type: "success", message: "Link deleted." });
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
    if (isMutating) return;

    setConfirmDeleteId(null);
    setEditingId(null); // Cancel editing if they drag

    const previous = links;
    const items = Array.from(links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    setLinks(updatedItems);

    startMutate(async () => {
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
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW LINK FORM */}
      <form
        ref={formRef}
        onSubmit={handleAddLink}
        className={`${CARD_CLASS} shadow-xl space-y-5`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Add New Link
            </h3>
          </div>
          {hasLimit && (
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field id="lm-platform" label="Platform" icon={<currentPlatform.icon className="w-3.5 h-3.5" />}>
            <select
              id="lm-platform"
              name="platform"
              required
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <Field id="lm-title" label="Title" icon={<Type className="w-3.5 h-3.5" />}>
            <input
              id="lm-title"
              name="title"
              required
              maxLength={TITLE_MAX}
              onChange={(e) => setTitleLength(e.target.value.length)}
              placeholder={currentPlatform.placeholder}
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <p
              className={`text-[11px] text-right ${
                titleLength >= TITLE_MAX ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
              }`}
            >
              {titleLength}/{TITLE_MAX}
            </p>
          </Field>

          <Field id="lm-url" label="URL" icon={<LinkIcon className="w-3.5 h-3.5" />}>
            <input
              id="lm-url"
              name="url"
              type="url"
              inputMode="url"
              required
              placeholder="https://"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {isAtLimit && (
          <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            You&apos;ve reached your plan limit. Remove a link or upgrade to add more.
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy || isAtLimit}
          className="w-full sm:w-auto sm:ml-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Adding..." : "Add Link"}
        </button>
      </form>

      {/* DRAG AND DROP LIST */}
      <div className="space-y-2">
        {links.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Your Links ({links.length})
              {isMutating && (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin text-slate-400"
                  aria-label="Saving changes"
                />
              )}
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
                    <div className={`${CARD_CLASS} text-center py-10`}>
                      <Share2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                        No links yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add your first link above and it will show on your profile.
                      </p>
                    </div>
                  )}

                  {links.map((link, index) => {
                    const Icon = PLATFORMS.find((p) => p.id === link.platform)?.icon || Globe;
                    const isConfirmingDelete = confirmDeleteId === link.id;
                    const isEditing = editingId === link.id;

                    return (
                      <Draggable
                        key={link.id}
                        draggableId={link.id}
                        index={index}
                        isDragDisabled={isMutating || isEditing}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white dark:bg-dark-900 rounded-2xl border ${
                              snapshot.isDragging
                                ? "border-brand-500 shadow-2xl scale-[1.02]"
                                : "border-slate-200 dark:border-white/10 shadow-sm"
                            } transition-all`}
                          >
                            <div className="flex items-center gap-4 flex-1 w-full">
                              <div
                                {...provided.dragHandleProps}
                                className={`text-slate-400 hover:text-brand-500 cursor-grab active:cursor-grabbing shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${isEditing ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                                aria-label={`Drag to reorder ${link.title}`}
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>

                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                              </div>

                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="space-y-2 pr-2">
                                    <input 
                                      type="text" 
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      placeholder="Title"
                                      className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-dark-950 border border-brand-500/50 outline-none focus:ring-2 focus:ring-brand-500/20" 
                                    />
                                    <input 
                                      type="url" 
                                      value={editUrl}
                                      onChange={(e) => setEditUrl(e.target.value)}
                                      placeholder="https://"
                                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500/50" 
                                    />
                                  </div>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-12 sm:ml-0">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(link.id)}
                                    disabled={isMutating}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : isConfirmingDelete ? (
                                <>
                                  <span className="hidden sm:inline text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1">
                                    Delete?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLink(link.id)}
                                    disabled={isBusy}
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
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(link)}
                                    disabled={isBusy}
                                    className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Edit link"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(link.id)}
                                    disabled={isBusy}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete link"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
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