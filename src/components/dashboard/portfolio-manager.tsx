"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import imageCompression from "browser-image-compression";
import {
  savePortfolioItem,
  deletePortfolioItem,
  deletePortfolioImage,
} from "@/app/dashboard/portfolio/actions";

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  image_urls: string[] | null;
  position: number;
};

// A new item has no id yet
type PortfolioDraft = Omit<PortfolioItem, "id"> & { id?: string };

type NewImage = { file: File; preview: string };

interface PortfolioManagerProps {
  initialItems: PortfolioItem[];
  /** Optional plan limit (e.g. TIER_CONFIG[tier].maxPortfolioItems). Enforce it on the server too. */
  maxItems?: number;
}

const MAX_IMAGES = 10;
const MAX_FILE_MB = 15;

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

export function PortfolioManager({
  initialItems,
  maxItems,
}: PortfolioManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PortfolioDraft | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Images: already saved, newly selected (not uploaded yet), and saved ones staged for removal
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = currentItem !== null;
  const isBusy = isPending || isCompressing;
  const totalImages = existingImages.length + newImages.length;
  const isAtItemLimit =
    typeof maxItems === "number" && items.length >= maxItems;

  // Keep local list in sync when the server re-sends fresh data (after router.refresh())
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  // Free preview blob URLs when the component unmounts
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
        message: `You've reached your plan limit of ${maxItems} portfolio items. Upgrade to add more.`,
      });
      return;
    }
    setFeedback(null);
    setCurrentItem({
      title: "",
      description: "",
      link_url: "",
      image_urls: [],
      position: items.length,
    });
    setExistingImages([]);
    setRemovedImages([]);
    clearNewImages();
  }

  function handleEdit(item: PortfolioItem) {
    setFeedback(null);
    setConfirmDeleteId(null);
    setCurrentItem(item);
    setExistingImages(item.image_urls || []);
    setRemovedImages([]);
    clearNewImages();
  }

  function handleCancel() {
    setCurrentItem(null);
    setExistingImages([]);
    setRemovedImages([]);
    clearNewImages();
  }

  // When one or more new pictures are selected
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    e.target.value = ""; // lets the user pick the same file again later
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

  // Remove a newly selected picture before saving
  function handleRemoveNewImage(index: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Remove a saved picture. It's only staged here and deleted from storage after a
  // successful save, so pressing Cancel brings everything back.
  function handleRemoveExisting(urlToRemove: string) {
    setExistingImages((prev) => prev.filter((url) => url !== urlToRemove));
    setRemovedImages((prev) => [...prev, urlToRemove]);
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

    if (totalImages > MAX_IMAGES) {
      setFeedback({
        type: "error",
        message: `You can have up to ${MAX_IMAGES} images per item.`,
      });
      return;
    }

    // Compress every new file before appending it to the FormData
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
          message: "Failed to process one of the images. Try a different file.",
        });
        setIsCompressing(false);
        return;
      }
      setIsCompressing(false);
    }

    const imagesToDelete = removedImages;

    startTransition(async () => {
      const result = await savePortfolioItem(formData);

      if (result?.error) {
        // The editor stays open with everything intact, so nothing is lost on error
        setFeedback({ type: "error", message: result.error });
        return;
      }

      // Now that the save worked, remove the images the user took out.
      // Errors are ignored in case the server action already removed them.
      for (const url of imagesToDelete) {
        try {
          await deletePortfolioImage(url);
        } catch {
          /* ignore */
        }
      }

      handleCancel();
      setFeedback({ type: "success", message: "Portfolio item saved!" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
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
              Featured Portfolio
            </h2>
            {typeof maxItems === "number" && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  isAtItemLimit
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent"
                }`}
              >
                {items.length} / {maxItems} items
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Showcase your best projects with multiple images per post.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleAddNew}
            disabled={isAtItemLimit}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* FORM: ADD / EDIT ITEM */}
      {currentItem && (
        <form
          key={currentItem.id ?? "new-item"}
          onSubmit={handleSubmit}
          className="glass-card p-6 md:p-8 rounded-3xl shadow-xl border border-brand-500/30 bg-slate-50 dark:bg-dark-900 space-y-6 animate-in slide-in-from-top-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {currentItem.id ? "Edit Item" : "Add New Item"}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isBusy}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input type="hidden" name="id" value={currentItem.id || ""} />
          {/* Pass the remaining saved images as a JSON string */}
          <input
            type="hidden"
            name="existing_image_urls"
            value={JSON.stringify(existingImages)}
          />
          <input type="hidden" name="position" value={currentItem.position} />

          <div className="flex flex-col gap-6">
            {/* MULTI-IMAGE GALLERY UPLOADER */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Images
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {totalImages} / {MAX_IMAGES}
                </span>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Existing Images */}
                {existingImages.map((url) => (
                  <div
                    key={url}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Saved project"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(url)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* New Images Preview */}
                {newImages.map((img, idx) => (
                  <div
                    key={img.preview}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt="New upload preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">
                      NEW
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove new image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button Box */}
                {totalImages < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-100 dark:bg-dark-950 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">
                      {totalImages === 0 ? "Upload" : "Add more"}
                    </span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Images are optimized automatically before upload. Removed images
                are only deleted when you save.
              </p>

              {/* Allow Multiple Uploads */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Item Details */}
            <div className="w-full space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Title
                </label>
                <input
                  name="title"
                  defaultValue={currentItem.title}
                  required
                  maxLength={80}
                  placeholder="e.g. Custom 3D Printed Stand"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  defaultValue={currentItem.description ?? ""}
                  rows={3}
                  maxLength={500}
                  placeholder="Detailed project description..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Action Link (Optional)
                </label>
                <input
                  name="link_url"
                  type="url"
                  defaultValue={currentItem.link_url ?? ""}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
                    : "Save Portfolio Item"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isBusy}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* PORTFOLIO GRID LIST */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.length === 0 ? (
            <div className="col-span-1 md:col-span-2 p-10 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                No portfolio items yet. Click "Add Item" to create your first one.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isConfirmingDelete = confirmDeleteId === item.id;
              const isDeleting = deletingId === item.id;
              const images = item.image_urls || [];

              return (
                <div
                  key={item.id}
                  className={`glass-card p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 flex flex-col gap-4 transition-opacity ${
                    isDeleting ? "opacity-50" : ""
                  }`}
                >
                  {/* Image Cover/Gallery Indicator */}
                  <div className="w-full h-40 shrink-0 rounded-2xl bg-slate-100 dark:bg-dark-950 overflow-hidden border border-slate-200 dark:border-white/10 relative">
                    {images.length > 0 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                            +{images.length - 1} Photos
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                      {isConfirmingDelete ? (
                        <>
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1">
                            Delete this item and its images?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
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
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Edit Item"
                            aria-label="Edit item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isPending}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Delete Item"
                            aria-label="Delete item"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          {item.link_url && isSafeHttpUrl(item.link_url) && (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                            >
                              Visit Link <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}