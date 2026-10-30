"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Save,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Star,
  Link2,
  Tag,
  MousePointerClick,
  Wand2,
  Layers,
  Lock,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import imageCompression from "browser-image-compression";
import {
  savePortfolioItem,
  deletePortfolioItem,
  deletePortfolioImage,
  updatePortfolioOrder,
} from "@/app/dashboard/portfolio/actions";

export type PortfolioItem = {
  id: string;
  title: string;
  category?: string | null;
  description: string | null;
  link_url: string | null;
  cta_label?: string | null;
  image_urls: string[] | null;
  position: number;
  clicks?: number | null;
};

type PortfolioDraft = Omit<PortfolioItem, "id"> & { id?: string };
type NewImage = { file: File; preview: string };

interface PortfolioManagerProps {
  initialItems: PortfolioItem[];
  userTier: "demo" | "standard" | "premium";
}

const MAX_IMAGES = 10;
const MAX_FILE_MB = 15;

const QUICK_CATEGORIES = [
  "Web & Software",
  "3D Printing & Fabrication",
  "Graphic & Packaging",
  "Motion Design",
  "Hardware & IoT",
  "Featured Product",
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition";

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// Auto-convert Google Drive sharing links into direct high-res image URLs
function formatImageLink(inputUrl: string): {
  url: string;
  wasConverted: boolean;
} {
  const trimmed = inputUrl.trim();
  if (!trimmed || !trimmed.includes("drive.google.com")) {
    return { url: trimmed, wasConverted: false };
  }

  const fileIdMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (!fileIdMatch || !fileIdMatch[1]) {
    return { url: trimmed, wasConverted: false };
  }

  const formatted = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1200`;
  return { url: formatted, wasConverted: formatted !== trimmed };
}

export function PortfolioManager({
  initialItems,
  userTier,
}: PortfolioManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPremium = userTier === "premium";
  const maxItems = isPremium ? 20 : 3;

  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PortfolioDraft | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Images state
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [directImageUrlInput, setDirectImageUrlInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = currentItem !== null;
  const isBusy = isPending || isCompressing;
  const totalImages = existingImages.length + newImages.length;
  const isAtItemLimit = items.length >= maxItems;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  const newImagesRef = useRef<NewImage[]>([]);
  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);
  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  function clearNewImages() {
    newImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setNewImages([]);
  }

  function handleAddNew() {
    if (isAtItemLimit) {
      setFeedback({
        type: "error",
        message: `Limit reached (${maxItems} items). ${
          !isPremium ? "Upgrade to Premium to add up to 20 projects!" : ""
        }`,
      });
      return;
    }
    setFeedback(null);
    setCurrentItem({
      title: "",
      category: "",
      description: "",
      link_url: "",
      cta_label: "View Project",
      image_urls: [],
      position: items.length,
    });
    setCategoryInput("");
    setExistingImages([]);
    setRemovedImages([]);
    setDirectImageUrlInput("");
    clearNewImages();
  }

  function handleEdit(item: PortfolioItem) {
    setFeedback(null);
    setConfirmDeleteId(null);
    setCurrentItem(item);
    setCategoryInput(item.category || "");
    setExistingImages(item.image_urls || []);
    setRemovedImages([]);
    setDirectImageUrlInput("");
    clearNewImages();
  }

  function handleCancel() {
    setCurrentItem(null);
    setCategoryInput("");
    setExistingImages([]);
    setRemovedImages([]);
    setDirectImageUrlInput("");
    clearNewImages();
  }

  function handleAddDirectImageUrl() {
    if (!isPremium) return;
    const raw = directImageUrlInput.trim();
    if (!raw) return;

    if (totalImages >= MAX_IMAGES) {
      setFeedback({
        type: "error",
        message: `Maximum of ${MAX_IMAGES} images per project reached.`,
      });
      return;
    }

    const { url, wasConverted } = formatImageLink(raw);
    if (!isSafeHttpUrl(url)) {
      setFeedback({
        type: "error",
        message: "Image URL must start with http:// or https://",
      });
      return;
    }

    if (existingImages.includes(url)) {
      setFeedback({
        type: "error",
        message: "This image URL is already added to this project.",
      });
      return;
    }

    setExistingImages((prev) => [...prev, url]);
    setDirectImageUrlInput("");
    if (wasConverted) {
      setFeedback({
        type: "success",
        message:
          "Google Drive image link automatically converted to direct high-res thumbnail!",
      });
    } else {
      setFeedback(null);
    }
  }

  function handleMakeCover(index: number) {
    if (index === 0) return;
    setExistingImages((prev) => {
      const updated = [...prev];
      const [picked] = updated.splice(index, 1);
      return [picked, ...updated];
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (selected.length === 0) return;

    const valid = selected.filter(
      (file) =>
        file.type.startsWith("image/") && file.size <= MAX_FILE_MB * 1024 * 1024
    );
    const skippedInvalid = selected.length - valid.length;

    const slots = Math.max(0, MAX_IMAGES - totalImages);
    const accepted = valid.slice(0, slots);
    const skippedOverLimit = valid.length - accepted.length;

    if (accepted.length > 0) {
      setNewImages((prev) => [
        ...prev,
        ...accepted.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        })),
      ]);
    }

    if (skippedInvalid > 0 || skippedOverLimit > 0) {
      const reasons: string[] = [];
      if (skippedInvalid > 0) {
        reasons.push(
          `${skippedInvalid} file(s) skipped (images only, max ${MAX_FILE_MB}MB each)`
        );
      }
      if (skippedOverLimit > 0) {
        reasons.push(
          `${skippedOverLimit} file(s) skipped (limit is ${MAX_IMAGES} images)`
        );
      }
      setFeedback({ type: "error", message: reasons.join(". ") + "." });
    } else {
      setFeedback(null);
    }
  }

  function handleRemoveNewImage(index: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleRemoveExisting(urlToRemove: string) {
    setExistingImages((prev) => prev.filter((url) => url !== urlToRemove));
    setRemovedImages((prev) => [...prev, urlToRemove]);
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const previous = items;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const updated = reordered.map((item, idx) => ({
      ...item,
      position: idx,
    }));
    setItems(updated);

    startTransition(async () => {
      try {
        const res = await updatePortfolioOrder(
          updated.map((i) => ({ id: i.id, position: i.position }))
        );
        if (res?.error) {
          setItems(previous);
          setFeedback({ type: "error", message: res.error });
        }
      } catch {
        setItems(previous);
        setFeedback({
          type: "error",
          message: "Could not save new portfolio order.",
        });
      }
    });
  }

  async function handleDelete(item: PortfolioItem) {
    setFeedback(null);
    setConfirmDeleteId(null);
    setDeletingId(item.id);

    startTransition(async () => {
      try {
        const res = (await deletePortfolioItem(
          item.id,
          item.image_urls || []
        )) as unknown as { error?: string } | undefined;

        if (res?.error) {
          setFeedback({ type: "error", message: res.error });
        } else {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          setFeedback({ type: "success", message: "Portfolio item deleted." });
          router.refresh();
        }
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete the item. Please try again.",
        });
      } finally {
        setDeletingId(null);
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    const linkUrl = String(formData.get("link_url") || "").trim();
    if (linkUrl && !isSafeHttpUrl(linkUrl)) {
      setFeedback({
        type: "error",
        message: "Action link must start with http:// or https://",
      });
      return;
    }
    formData.set("link_url", linkUrl);
    
    if (isPremium) {
      formData.set("category", categoryInput.trim());
    } else {
      formData.set("category", "");
    }

    if (totalImages > MAX_IMAGES) {
      setFeedback({
        type: "error",
        message: `You can have up to ${MAX_IMAGES} images per item.`,
      });
      return;
    }

    if (newImages.length > 0) {
      setIsCompressing(true);
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      try {
        for (const { file } of newImages) {
          const compressedFile = await imageCompression(file, options);
          formData.append("images", compressedFile, compressedFile.name);
        }
      } catch (error) {
        console.error("Compression failed for a file:", error);
        setFeedback({
          type: "error",
          message: "Failed to process one of the images.",
        });
        setIsCompressing(false);
        return;
      }
      setIsCompressing(false);
    }

    const imagesToDelete = removedImages;

    startTransition(async () => {
      try {
        const result = await savePortfolioItem(formData);

        if (result?.error) {
          setFeedback({ type: "error", message: result.error });
          return;
        }

        for (const url of imagesToDelete) {
          try {
            await deletePortfolioImage(url);
          } catch {
            /* ignore */
          }
        }

        handleCancel();
        setFeedback({ type: "success", message: "Portfolio project saved!" });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Upload failed.",
        });
      }
    });
  }

  const totalProjectClicks = items.reduce(
    (sum, item) => sum + (item.clicks ?? 0),
    0
  );
  const totalPhotosCount = items.reduce(
    (sum, item) => sum + (item.image_urls?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ANALYTICS SUMMARY CARDS (PREMIUM ONLY) */}
      {isPremium && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Published Projects
              </p>
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {items.length} / {maxItems}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Showcase Photos
              </p>
              <p className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {totalPhotosCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Project Link Clicks
              </p>
              <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalProjectClicks}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

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

      {/* HEADER & ADD BUTTON */}
      <div className="flex items-center justify-between gap-4 glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Featured Portfolio & Case Studies
            </h2>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isAtItemLimit
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent"
              }`}
            >
              {items.length} / {maxItems} items
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Drag to reorder projects and showcase your best work.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleAddNew}
            disabled={isAtItemLimit}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Project
          </button>
        )}
      </div>

      {/* FORM: ADD / EDIT ITEM */}
      {currentItem && (
        <form
          key={currentItem.id ?? "new-item"}
          onSubmit={handleSubmit}
          className="glass-card p-6 md:p-8 rounded-3xl shadow-xl border border-brand-500/30 bg-white dark:bg-dark-900 space-y-6 animate-in slide-in-from-top-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {currentItem.id ? "Edit Portfolio Project" : "Add New Portfolio Project"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload images or paste direct links to save storage.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isBusy}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer disabled:opacity-60"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input type="hidden" name="id" value={currentItem.id || ""} />
          <input
            type="hidden"
            name="existing_image_urls"
            value={JSON.stringify(existingImages)}
          />
          <input type="hidden" name="position" value={currentItem.position} />

          {/* MULTI-IMAGE GALLERY & DIRECT URL INPUT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Gallery ({totalImages} / {MAX_IMAGES} Photos)
              </label>
              <span className="text-[11px] text-slate-400">
                Click ★ on any saved photo to set as main cover
              </span>
            </div>

            {/* Direct Image URL / Google Drive Bar (PREMIUM ONLY) */}
            {isPremium ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 space-y-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-brand-500" />
                  <span>Add Image via Direct URL or Google Drive Share Link (Zero Storage Used)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={directImageUrlInput}
                    onChange={(e) => setDirectImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDirectImageUrl();
                      }
                    }}
                    placeholder="Paste Google Drive image link, Imgur, or direct https:// image URL..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddDirectImageUrl}
                    disabled={!directImageUrlInput.trim() || totalImages >= MAX_IMAGES}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 font-semibold text-xs shrink-0 transition cursor-pointer disabled:opacity-50"
                  >
                    + Add URL
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="text-xs font-semibold text-brand-800 dark:text-brand-300">
                    Add Images via Direct Links (Google Drive) is available on Premium.
                  </span>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="text-[10px] font-bold uppercase tracking-wider bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg shrink-0 transition"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Thumbnails Grid */}
            <div className="flex flex-wrap gap-3.5 pt-1">
              {existingImages.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className={`relative w-28 h-28 rounded-2xl overflow-hidden border-2 group transition-all ${
                    idx === 0
                      ? "border-amber-500 shadow-md"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Project photo"
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 ? (
                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                      <Star className="w-2.5 h-2.5 fill-current" /> COVER
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMakeCover(idx)}
                      title="Set as Cover Photo"
                      className="absolute top-1.5 left-1.5 p-1 bg-black/60 hover:bg-amber-500 text-white hover:text-slate-950 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveExisting(url)}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shadow"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {newImages.map((img, idx) => (
                <div
                  key={img.preview}
                  className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt="New upload preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                    FILE
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Remove new image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {totalImages < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50 dark:bg-dark-950 flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Upload File
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* PROJECT DETAILS */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Title
                </label>
                <input
                  name="title"
                  defaultValue={currentItem.title}
                  required
                  maxLength={80}
                  placeholder="e.g. Custom 3D Printed NFC Stand"
                  className={inputClass}
                />
              </div>

              {/* CATEGORY INPUT (PREMIUM ONLY) */}
              {isPremium ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-brand-500" />
                    <span>Category (For Filter Pills)</span>
                  </label>
                  <input
                    name="category"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. 3D Printing & Fabrication"
                    className={inputClass}
                  />
                </div>
              ) : (
                <div className="space-y-1.5 opacity-50 relative">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-brand-500" />
                    <span>Category</span>
                  </label>
                  <input
                    disabled
                    placeholder="Upgrade to Premium to use Categories"
                    className={inputClass}
                  />
                  <Lock className="absolute right-3 top-[34px] w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>

            {/* Quick Category Pills (PREMIUM ONLY) */}
            {isPremium && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 mr-1">
                  Quick tags:
                </span>
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryInput(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      categoryInput === cat
                        ? "bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400"
                        : "bg-slate-50 dark:bg-dark-950 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Description / Case Study Summary (Optional)
              </label>
              <textarea
                name="description"
                defaultValue={currentItem.description ?? ""}
                rows={3}
                maxLength={500}
                placeholder="Share the tools used, client results, or product specifications..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-brand-500" />
                  <span>Action / Live Project URL (Optional)</span>
                </label>
                <input
                  name="link_url"
                  type="url"
                  defaultValue={currentItem.link_url ?? ""}
                  placeholder="https://your-project-demo.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Button Label
                </label>
                <input
                  name="cta_label"
                  maxLength={30}
                  defaultValue={currentItem.cta_label || "View Project"}
                  placeholder="e.g. View Live Demo"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isBusy}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isCompressing
                  ? "Optimizing images..."
                  : isPending
                  ? "Saving..."
                  : "Save Project"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* DRAG-AND-DROP PORTFOLIO LIST */}
      {!isEditing && (
        <div>
          {!isMounted ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">
                No portfolio projects yet. Click &ldquo;Add Project&rdquo; to showcase your work.
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="portfolio-items-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    {items.map((item, index) => {
                      const isConfirmingDelete = confirmDeleteId === item.id;
                      const isDeleting = deletingId === item.id;
                      const images = item.image_urls || [];

                      return (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`glass-card p-5 rounded-3xl border bg-white dark:bg-dark-900 flex flex-col gap-4 transition-all ${
                                snapshot.isDragging
                                  ? "border-brand-500 shadow-2xl scale-[1.02] z-20"
                                  : "border-slate-200 dark:border-white/10 shadow-sm"
                              } ${isDeleting ? "opacity-50" : ""}`}
                            >
                              {/* Cover Preview */}
                              <div className="w-full h-44 shrink-0 rounded-2xl bg-slate-100 dark:bg-dark-950 overflow-hidden border border-slate-200 dark:border-white/10 relative group">
                                {images.length > 0 ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={images[0]}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                    {images.length > 1 && (
                                      <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md">
                                        +{images.length - 1} Photos
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon className="w-8 h-8" />
                                  </div>
                                )}

                                {/* Drag Handle Pill */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1 cursor-grab active:cursor-grabbing"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                  <span>Drag</span>
                                </div>

                                {item.category && (
                                  <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-black/70 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-bold uppercase tracking-wider">
                                    {item.category}
                                  </span>
                                )}
                              </div>

                              {/* Details & Footer */}
                              <div className="flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 break-words">
                                      {item.title}
                                    </h4>
                                    {isPremium && typeof item.clicks === "number" && (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                                        <MousePointerClick className="w-3 h-3" />
                                        {item.clicks}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed break-words">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                  {isConfirmingDelete ? (
                                    <>
                                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1">
                                        Delete project?
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(item)}
                                        disabled={isDeleting}
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                        title="Edit Project"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteId(item.id)
                                        }
                                        disabled={isPending}
                                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
                                        title="Delete Project"
                                      >
                                        {isDeleting ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
                                      {item.link_url &&
                                        isSafeHttpUrl(item.link_url) && (
                                          <a
                                            href={item.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors truncate max-w-[180px]"
                                          >
                                            <span className="truncate">
                                              {item.cta_label || "View Project"}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                          </a>
                                        )}
                                    </>
                                  )}
                                </div>
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
      )}
    </div>
  );
}