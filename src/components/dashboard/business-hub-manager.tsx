"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GripVertical,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  addService,
  updateService,
  deleteService,
  updateServiceOrder,
  updateBusinessSettings,
} from "@/app/dashboard/business/actions";

type ServiceItem = {
  id: string;
  title: string;
  price: string;
  description: string | null;
  position: number;
};

interface BusinessHubManagerProps {
  initialServices: ServiceItem[];
  profile: {
    location_address?: string | null;
    map_embed_url?: string | null;
    booking_enabled?: boolean | null;
    booking_url?: string | null;
    catalog_title?: string | null;
    catalog_pdf_url?: string | null;
  };
}

type TabType = "services" | "map" | "appointments" | "catalog";

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition";

const editInputClass =
  "w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition";

const submitBtnClass =
  "w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ALLOWED_MAP_PREFIXES = [
  "https://www.google.com/maps/embed",
  "https://maps.google.com/maps",
];

function isAllowedMapSrc(src: string): boolean {
  return ALLOWED_MAP_PREFIXES.some((prefix) => src.startsWith(prefix));
}

// Only plain http(s) links are allowed (blocks javascript:, data:, etc.)
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isShortMapLink(value: string): boolean {
  return value.includes("maps.app.goo.gl") || value.includes("goo.gl/maps");
}

// Returns a valid Google Maps embed src from a pasted <iframe> or embed URL, else null
function extractEmbedSrc(embedInput: string): string | null {
  const trimmed = embedInput.trim();
  if (!trimmed) return null;

  // 1. If a full <iframe> code was pasted, pull out the src=""
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  const candidate = (iframeMatch?.[1] ?? trimmed).replace(/&amp;/g, "&");

  // 2. Only accept real Google Maps embed URLs
  return isAllowedMapSrc(candidate) ? candidate : null;
}

// 3. Smart Search: fall back to searching the typed address directly in a Google Maps iframe
function getResolvedMapSrc(
  embedInput: string,
  addressInput: string
): string | null {
  const embedSrc = extractEmbedSrc(embedInput);
  if (embedSrc) return embedSrc;

  const trimmedAddress = addressInput.trim();
  if (trimmedAddress.length > 0) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      trimmedAddress
    )}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  return null;
}

function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function BusinessHubManager({
  initialServices,
  profile,
}: BusinessHubManagerProps) {
  const router = useRouter();
  const addFormRef = useRef<HTMLFormElement>(null);
  const catalogFileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("services");
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Inline Edit State for Services
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Live Map Preview State
  const [locationAddress, setLocationAddress] = useState(
    profile?.location_address || ""
  );
  const [mapEmbedInput, setMapEmbedInput] = useState(
    profile?.map_embed_url || ""
  );

  // Debounce so the iframe doesn't reload on every keystroke
  const debouncedAddress = useDebouncedValue(locationAddress, 600);
  const debouncedEmbed = useDebouncedValue(mapEmbedInput, 600);

  // Prevent hydration mismatch with drag-and-drop library
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keep local list in sync when the server re-sends fresh data (after router.refresh())
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  const tabs = [
    { id: "services", label: "Services & Pricing", icon: Briefcase },
    { id: "map", label: "Location & Map", icon: MapPin },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "catalog", label: "PDF Catalog / Menu", icon: FileText },
  ] as const;

  const previewMapSrc = getResolvedMapSrc(debouncedEmbed, debouncedAddress);
  const isShortLinkWarning = isShortMapLink(mapEmbedInput);
  const isEmbedInvalid =
    mapEmbedInput.trim().length > 0 &&
    !isShortLinkWarning &&
    !extractEmbedSrc(mapEmbedInput);

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setFeedback(null);
    setEditingId(null);
    setConfirmDeleteId(null);
  }

  function startEditing(service: ServiceItem) {
    setEditingId(service.id);
    setEditTitle(service.title);
    setEditPrice(service.price);
    setEditDescription(service.description || "");
    setConfirmDeleteId(null);
    setFeedback(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditPrice("");
    setEditDescription("");
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLDivElement>,
    id: string
  ) {
    if (e.key === "Escape") {
      cancelEditing();
    } else if (
      e.key === "Enter" &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      handleUpdateService(id);
    }
  }

  function handleAddService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    formData.append("position", services.length.toString());

    startTransition(async () => {
      const result = await addService(formData);
      if (result?.error) {
        // Form keeps what the user typed, so nothing is lost on error
        setFeedback({ type: "error", message: result.error });
        return;
      }
      addFormRef.current?.reset();
      setFeedback({ type: "success", message: "Service added successfully!" });
      router.refresh();
    });
  }

  function handleUpdateService(id: string) {
    if (!editTitle.trim() || !editPrice.trim()) {
      setFeedback({
        type: "error",
        message: "Service name and price are required.",
      });
      return;
    }

    setFeedback(null);
    const formData = new FormData();
    formData.append("id", id);
    formData.append("title", editTitle.trim());
    formData.append("price", editPrice.trim());
    formData.append("description", editDescription.trim());

    // Optimistic update, with a snapshot so we can roll back on failure
    const previous = services;
    setServices((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editTitle.trim(),
              price: editPrice.trim(),
              description: editDescription.trim() || null,
            }
          : item
      )
    );
    setEditingId(null);

    startTransition(async () => {
      const result = await updateService(formData);
      if (result?.error) {
        setServices(previous);
        setFeedback({ type: "error", message: result.error });
      } else {
        setFeedback({
          type: "success",
          message: "Service updated successfully!",
        });
      }
    });
  }

  function handleDeleteService(id: string) {
    setFeedback(null);
    setConfirmDeleteId(null);

    const previous = services;
    setServices((prev) => prev.filter((item) => item.id !== id));

    startTransition(async () => {
      const result = await deleteService(id);
      if (result?.error) {
        setServices(previous);
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const previous = services;
    const items = Array.from(services);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state position numbers immediately
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    setServices(updatedItems);

    // Persist new order in the database via Server Action
    startTransition(async () => {
      try {
        const res = (await updateServiceOrder(
          updatedItems.map((item) => ({ id: item.id, position: item.position }))
        )) as unknown as { error?: string } | undefined;

        if (res?.error) {
          setServices(previous);
          setFeedback({ type: "error", message: res.error });
        }
      } catch {
        setServices(previous);
        setFeedback({
          type: "error",
          message: "Could not save the new order. Please try again.",
        });
      }
    });
  }

  function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const section = formData.get("section");

    // Client-side checks (the server action should still validate these too)
    if (section === "map") {
      const embed = String(formData.get("map_embed_url") || "").trim();
      if (embed && isShortMapLink(embed)) {
        setFeedback({
          type: "error",
          message:
            "Short Google Maps links can't be embedded. Use Share → Embed a map instead.",
        });
        return;
      }
      if (embed && !extractEmbedSrc(embed)) {
        setFeedback({
          type: "error",
          message:
            "That doesn't look like a Google Maps embed link or iframe code.",
        });
        return;
      }
    }

    if (section === "appointments") {
      const url = String(formData.get("booking_url") || "").trim();
      if (url && !isSafeHttpUrl(url)) {
        setFeedback({
          type: "error",
          message: "Booking link must start with http:// or https://",
        });
        return;
      }
    }

    if (section === "catalog") {
      const url = String(formData.get("catalog_pdf_url") || "").trim();
      if (url && !isSafeHttpUrl(url)) {
        setFeedback({
          type: "error",
          message: "Catalog link must start with http:// or https://",
        });
        return;
      }
    }

    startTransition(async () => {
      const result = await updateBusinessSettings(formData);
      if (result?.error) {
        setFeedback({ type: "error", message: result.error });
      } else {
        if (section === "catalog" && catalogFileRef.current) {
          catalogFileRef.current.value = "";
        }
        setFeedback({
          type: "success",
          message: "Business settings saved successfully!",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* HORIZONTAL TAB NAVIGATION */}
      <div
        role="tablist"
        aria-label="Business hub sections"
        className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-white/10"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

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

      {/* TAB 1: SERVICES & PRICING */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <form
            ref={addFormRef}
            onSubmit={handleAddService}
            className="glass-card p-6 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-white/10"
          >
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Add Service or Package
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showcase your offerings and rate cards directly on your public profile.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Name
                </label>
                <input
                  name="title"
                  required
                  maxLength={80}
                  placeholder="e.g. Full Web Application Setup"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Price / Rate
                </label>
                <input
                  name="price"
                  required
                  maxLength={40}
                  placeholder="e.g. ₱15,000 or Starts at ₱1,500"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Short Description (Optional)
              </label>
              <textarea
                name="description"
                rows={2}
                maxLength={240}
                placeholder="Briefly describe what is included in this service..."
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={isPending} className={submitBtnClass}>
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isPending ? "Saving..." : "Add Service"}
            </button>
          </form>

          {/* DRAG AND DROP SERVICES LIST WITH INLINE EDIT */}
          <div className="space-y-2">
            {services.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Your Services ({services.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Drag to reorder
                </span>
              </div>
            )}

            {!isMounted ? (
              <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="services-list">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {services.length === 0 && (
                        <p className="text-sm text-center text-slate-500 py-8">
                          No services added yet. Add your first service above.
                        </p>
                      )}

                      {services.map((service, index) => {
                        const isEditing = editingId === service.id;
                        const isConfirmingDelete =
                          confirmDeleteId === service.id;

                        return (
                          <Draggable
                            key={service.id}
                            draggableId={service.id}
                            index={index}
                            isDragDisabled={isEditing}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 bg-white dark:bg-dark-900 rounded-2xl border ${
                                  snapshot.isDragging
                                    ? "border-brand-500 shadow-2xl scale-[1.02]"
                                    : "border-slate-200 dark:border-white/10 shadow-sm"
                                } transition-all`}
                              >
                                {isEditing ? (
                                  /* INLINE EDIT MODE (Enter = save, Esc = cancel) */
                                  <div
                                    className="space-y-3"
                                    onKeyDown={(e) =>
                                      handleEditKeyDown(e, service.id)
                                    }
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                          Service Name
                                        </label>
                                        <input
                                          autoFocus
                                          value={editTitle}
                                          maxLength={80}
                                          onChange={(e) =>
                                            setEditTitle(e.target.value)
                                          }
                                          placeholder="Service Name"
                                          className={editInputClass}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                          Price / Rate
                                        </label>
                                        <input
                                          value={editPrice}
                                          maxLength={40}
                                          onChange={(e) =>
                                            setEditPrice(e.target.value)
                                          }
                                          placeholder="Price / Rate"
                                          className={editInputClass}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                        Description (Optional)
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={editDescription}
                                        maxLength={240}
                                        onChange={(e) =>
                                          setEditDescription(e.target.value)
                                        }
                                        placeholder="Short description..."
                                        className={editInputClass}
                                      />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={cancelEditing}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() =>
                                          handleUpdateService(service.id)
                                        }
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                      >
                                        {isPending ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* STANDARD DISPLAY MODE */
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 overflow-hidden">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="text-slate-400 hover:text-brand-500 cursor-grab active:cursor-grabbing shrink-0"
                                        aria-label="Drag to reorder"
                                      >
                                        <GripVertical className="w-5 h-5" />
                                      </div>

                                      <div className="space-y-1 overflow-hidden">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {service.title}
                                          </h4>
                                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                            {service.price}
                                          </span>
                                        </div>
                                        {service.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {service.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isConfirmingDelete ? (
                                        <>
                                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1">
                                            Delete?
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteService(service.id)
                                            }
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmDeleteId(null)
                                            }
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                          >
                                            No
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => startEditing(service)}
                                            className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer"
                                            title="Edit Service"
                                            aria-label="Edit service"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmDeleteId(service.id)
                                            }
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                            title="Delete Service"
                                            aria-label="Delete service"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
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
      )}

      {/* TAB 2: LOCATION & INTERACTIVE MAP */}
      {activeTab === "map" && (
        <form
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="map" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Interactive Map & Store Location
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Display your physical store, studio, or office address and an interactive Google Map on your card.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Search Location / Address / Landmark
            </label>
            <input
              name="location_address"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. 435 Illang-illang St. Imus City, Cavite"
              className={inputClass}
            />
            <p className="text-[11px] text-slate-400">
              Type your specific store name or address here to automatically generate the live Google Map below.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Custom Google Maps Embed URL or iframe Code (Optional)
            </label>
            <input
              name="map_embed_url"
              value={mapEmbedInput}
              onChange={(e) => setMapEmbedInput(e.target.value)}
              placeholder="https://www.google.com/maps/embed?pb=... or paste full <iframe> code"
              className={inputClass}
            />
            <p className="text-[11px] text-slate-400">
              Tip: Go to Google Maps, click <strong>Share → Embed a map</strong>, and paste the URL or iframe code here for an exact custom pin.
            </p>

            {isShortLinkWarning && (
              <p className="flex items-start gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                Short links (maps.app.goo.gl) can't be embedded. Use Share → Embed a map and paste that instead.
              </p>
            )}
            {isEmbedInvalid && (
              <p className="flex items-start gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                This doesn't look like a Google Maps embed link or iframe code, so the address search is used for the preview instead.
              </p>
            )}
          </div>

          {/* LIVE GOOGLE MAP PREVIEW */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Profile Map Preview
              </span>
              {locationAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    locationAddress
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {previewMapSrc ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-dark-950 shadow-inner">
                <iframe
                  src={previewMapSrc}
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps Location Preview"
                  className="w-full h-[260px]"
                />
                {locationAddress && (
                  <div className="px-4 py-3 bg-white dark:bg-dark-900 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="truncate">{locationAddress}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-center">
                <MapPin className="w-7 h-7 text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Enter an address or Google Maps embed link above to see your live interactive map preview.
                </p>
              </div>
            )}
          </div>

          <button type="submit" disabled={isPending} className={submitBtnClass}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Saving Map Settings..." : "Save Location & Map"}
          </button>
        </form>
      )}

      {/* TAB 3: APPOINTMENT SCHEDULING */}
      {activeTab === "appointments" && (
        <form
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="appointments" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Appointment Scheduling
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Let clients book consultations, meetings, or reservations directly from your public card.
            </p>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 cursor-pointer">
            <input
              type="checkbox"
              name="booking_enabled"
              defaultChecked={!!profile?.booking_enabled}
              className="w-4 h-4 accent-brand-600 rounded"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Enable Appointment Booking Button
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Displays a prominent "Book an Appointment" CTA on your public profile.
              </p>
            </div>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Booking / Calendar URL (Calendly, Cal.com, Google Calendar, or Form)
            </label>
            <input
              name="booking_url"
              type="url"
              defaultValue={profile?.booking_url || ""}
              placeholder="https://calendly.com/your-username"
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={isPending} className={submitBtnClass}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Saving Booking Settings..." : "Save Appointment Settings"}
          </button>
        </form>
      )}

      {/* TAB 4: PDF CATALOG / MENU VIEWER */}
      {activeTab === "catalog" && (
        <form
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="catalog" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              PDF Catalog / Digital Menu Viewer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload a PDF brochure, restaurant menu, or product catalog for visitors to view or download.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Button / Section Title
            </label>
            <input
              name="catalog_title"
              maxLength={60}
              defaultValue={
                profile?.catalog_title || "View Product Catalog / Menu"
              }
              placeholder="e.g. Download Our 2026 Product Catalog"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Upload PDF File
            </label>
            <input
              ref={catalogFileRef}
              type="file"
              name="catalog_file"
              accept="application/pdf"
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500/10 file:text-brand-600 hover:file:bg-brand-500/20 file:cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Or Direct PDF / Catalog Link
            </label>
            <input
              name="catalog_pdf_url"
              type="url"
              defaultValue={profile?.catalog_pdf_url || ""}
              placeholder="https://example.com/menu.pdf"
              className={inputClass}
            />
          </div>

          {profile?.catalog_pdf_url && isSafeHttpUrl(profile.catalog_pdf_url) && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10">
              <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                Active Catalog: {profile.catalog_pdf_url}
              </span>
              <a
                href={profile.catalog_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
              >
                <span>Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <button type="submit" disabled={isPending} className={submitBtnClass}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Saving Catalog..." : "Save Catalog Settings"}
          </button>
        </form>
      )}
    </div>
  );
}