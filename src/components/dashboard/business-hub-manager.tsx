"use client";

import { useState, useTransition, useEffect } from "react";
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
  Video,
  Phone,
  Users,
  Sparkles,
  Download,
  Eye,
  MousePointerClick,
  Wand2,
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
    booking_title?: string | null;
    booking_description?: string | null;
    booking_platform?: string | null;
    booking_clicks?: number | null;
    catalog_title?: string | null;
    catalog_description?: string | null;
    catalog_pdf_url?: string | null;
    catalog_cover_url?: string | null;
    catalog_action_type?: string | null;
    catalog_clicks?: number | null;
  };
}

type TabType = "services" | "map" | "appointments" | "catalog";
// Which request is running, so only the button that started it shows a spinner
type BusyAction = "add" | "update" | "delete" | "reorder" | "settings" | null;

const BOOKING_PLATFORMS = [
  { id: "calendar", label: "Calendly / Cal.com", icon: Calendar },
  { id: "video", label: "Zoom / Google Meet", icon: Video },
  { id: "phone", label: "Phone / Discovery Call", icon: Phone },
  { id: "inperson", label: "In-Person / Studio Visit", icon: Users },
] as const;

// Shared with every text field so they all look and behave the same
const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

const EDIT_INPUT_CLASS =
  "w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white outline-none transition-colors";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900";

const SUBMIT_BTN_CLASS = `w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed`;

const ALLOWED_MAP_PREFIXES = [
  "https://www.google.com/maps/embed",
  "https://maps.google.com/maps",
];

function isAllowedMapSrc(src: string): boolean {
  return ALLOWED_MAP_PREFIXES.some((prefix) => src.startsWith(prefix));
}

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

function extractEmbedSrc(embedInput: string): string | null {
  const trimmed = embedInput.trim();
  if (!trimmed) return null;

  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  const candidate = (iframeMatch?.[1] ?? trimmed).replace(/&amp;/g, "&");

  return isAllowedMapSrc(candidate) ? candidate : null;
}

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

function formatPriceDisplay(priceStr: string): string {
  if (!priceStr) return "";
  const trimmed = priceStr.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(trimmed));
  }
  return trimmed;
}

// Helper: Extract Google Drive File ID and convert to direct View, Download, or Thumbnail URL
function formatGoogleDriveLink(
  inputUrl: string,
  mode: "view" | "download" | "image"
): { url: string; wasConverted: boolean } {
  const trimmed = inputUrl.trim();
  if (!trimmed || !trimmed.includes("drive.google.com")) {
    return { url: inputUrl, wasConverted: false };
  }

  const fileIdMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (!fileIdMatch || !fileIdMatch[1]) {
    return { url: inputUrl, wasConverted: false };
  }

  const fileId = fileIdMatch[1];
  let formatted = trimmed;

  if (mode === "download") {
    formatted = `https://drive.google.com/uc?export=download&id=${fileId}`;
  } else if (mode === "image") {
    formatted = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  } else {
    formatted = `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return {
    url: formatted,
    wasConverted: formatted !== trimmed,
  };
}

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <p
      className={`text-[11px] text-right ${
        value >= max ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
      }`}
    >
      {value}/{max}
    </p>
  );
}

export function BusinessHubManager({
  initialServices,
  profile,
}: BusinessHubManagerProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("services");
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const isBusy = isPending || busyAction !== null;
  const [isMounted, setIsMounted] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newDescLength, setNewDescLength] = useState(0);

  const [locationAddress, setLocationAddress] = useState(
    profile?.location_address || ""
  );
  const [mapEmbedInput, setMapEmbedInput] = useState(
    profile?.map_embed_url || ""
  );

  const [bookingEnabled, setBookingEnabled] = useState(
    !!profile?.booking_enabled
  );
  const [bookingTitle, setBookingTitle] = useState(
    profile?.booking_title || "Book an Appointment"
  );
  const [bookingDesc, setBookingDesc] = useState(
    profile?.booking_description || ""
  );
  const [bookingPlatform, setBookingPlatform] = useState(
    profile?.booking_platform || "calendar"
  );

  const [catalogTitle, setCatalogTitle] = useState(
    profile?.catalog_title || "View Product Catalog / Menu"
  );
  const [catalogDesc, setCatalogDesc] = useState(
    profile?.catalog_description || ""
  );
  const [catalogCoverUrl, setCatalogCoverUrl] = useState(
    profile?.catalog_cover_url || ""
  );
  const [catalogPdfUrl, setCatalogPdfUrl] = useState(
    profile?.catalog_pdf_url || ""
  );
  const [catalogActionType, setCatalogActionType] = useState<"view" | "download">(
    profile?.catalog_action_type === "download" ? "download" : "view"
  );
  const [gdriveNotice, setGdriveNotice] = useState<string | null>(null);

  const debouncedAddress = useDebouncedValue(locationAddress, 600);
  const debouncedEmbed = useDebouncedValue(mapEmbedInput, 600);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

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

  // Auto-dismiss the Google Drive conversion notice
  useEffect(() => {
    if (!gdriveNotice) return;
    const timer = setTimeout(() => setGdriveNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [gdriveNotice]);

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
    setGdriveNotice(null);
  }

  function handleCatalogActionChange(mode: "view" | "download") {
    setCatalogActionType(mode);
    if (catalogPdfUrl.includes("drive.google.com")) {
      const { url } = formatGoogleDriveLink(catalogPdfUrl, mode);
      setCatalogPdfUrl(url);
      setGdriveNotice(
        `Google Drive link auto-formatted for ${
          mode === "download" ? "Direct Download" : "Instant Preview"
        }!`
      );
    }
  }

  function handleCatalogPdfUrlChange(rawValue: string) {
    const { url, wasConverted } = formatGoogleDriveLink(
      rawValue,
      catalogActionType
    );
    setCatalogPdfUrl(url);
    if (wasConverted) {
      setGdriveNotice(
        `Google Drive sharing link automatically converted to ${
          catalogActionType === "download"
            ? "Direct Download"
            : "Embed Preview"
        } link!`
      );
    }
  }

  function handleCatalogCoverUrlChange(rawValue: string) {
    const { url, wasConverted } = formatGoogleDriveLink(rawValue, "image");
    setCatalogCoverUrl(url);
    if (wasConverted) {
      setGdriveNotice(
        "Google Drive image link automatically converted to direct thumbnail URL!"
      );
    }
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
    if (isBusy) return; // ignore double submits while a request is running
    setFeedback(null);
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    formData.append("position", services.length.toString());
    setBusyAction("add");

    startTransition(async () => {
      try {
        const result = await addService(formData);
        if (result?.error) {
          setFeedback({ type: "error", message: result.error });
          return;
        }
        formElement.reset();
        setNewDescLength(0);
        setFeedback({ type: "success", message: "Service added successfully!" });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not add the service. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleUpdateService(id: string) {
    if (isBusy) return;
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
    setBusyAction("update");

    startTransition(async () => {
      try {
        const result = await updateService(formData);
        if (result?.error) {
          setServices(previous);
          setFeedback({ type: "error", message: result.error });
          return;
        }
        setFeedback({
          type: "success",
          message: "Service updated successfully!",
        });
        router.refresh();
      } catch {
        setServices(previous);
        setFeedback({
          type: "error",
          message: "Could not update the service. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleDeleteService(id: string) {
    if (isBusy) return;
    setFeedback(null);
    setConfirmDeleteId(null);
    setBusyAction("delete");

    const previous = services;
    setServices((prev) => prev.filter((item) => item.id !== id));

    startTransition(async () => {
      try {
        const result = await deleteService(id);
        if (result?.error) {
          setServices(previous);
          setFeedback({ type: "error", message: result.error });
          return;
        }
        setFeedback({ type: "success", message: "Service deleted." });
        router.refresh();
      } catch {
        setServices(previous);
        setFeedback({
          type: "error",
          message: "Could not delete the service. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    // Dragging is disabled while busy, so this is only a safety net
    if (isBusy) return;
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const previous = services;
    const items = Array.from(services);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    setServices(updatedItems);
    setBusyAction("reorder");

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
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isBusy) return;
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const section = formData.get("section");

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

    setBusyAction("settings");

    startTransition(async () => {
      try {
        const result = await updateBusinessSettings(formData);
        if (result?.error) {
          setFeedback({ type: "error", message: result.error });
          return;
        }
        setFeedback({
          type: "success",
          message: "Business settings saved successfully!",
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not save your settings. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  const SelectedBookingIcon =
    BOOKING_PLATFORMS.find((p) => p.id === bookingPlatform)?.icon || Calendar;

  const bookingClicks = profile?.booking_clicks ?? 0;
  const catalogClicks = profile?.catalog_clicks ?? 0;

  return (
    <div className="space-y-6">
      {/* CLICK & CONVERSION ANALYTICS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Services
            </p>
            <p className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
              {services.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Appointment Clicks
            </p>
            <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {bookingClicks}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MousePointerClick className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Catalog / Menu Opens
            </p>
            <p className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {catalogClicks}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
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
              id={`bh-tab-${tab.id}`}
              aria-controls={`bh-panel-${tab.id}`}
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${FOCUS_RING} ${
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

      {/* Sticky so feedback stays visible even when the user has scrolled down a long form or list */}
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

      {/* TAB 1: SERVICES & PRICING */}
      {activeTab === "services" && (
        <div role="tabpanel" id="bh-panel-services" aria-labelledby="bh-tab-services" className="space-y-6">
          <form
            onSubmit={handleAddService}
            className="glass-card p-6 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-white/10"
          >
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
<Briefcase className="w-5 h-5 text-brand-500 shrink-0" />
Add Service or Package
</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showcase your offerings and rate cards directly on your public profile.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="bh-service-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Service Name
</label>
                <input
                  id="bh-service-title"
 autoComplete="off"
 name="title"
                  required
                  maxLength={80}
                  placeholder="e.g. Full Web Application Setup"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bh-service-price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Price / Rate
</label>
                <input
                  id="bh-service-price"
 autoComplete="off"
 name="price"
                  required
                  maxLength={40}
                  placeholder="e.g. 15000 or Starts at ₱1,500"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bh-service-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Short Description (Optional)
</label>
              <textarea
                id="bh-service-description"
 name="description"
                rows={2}
                maxLength={240}
                onChange={(e) => setNewDescLength(e.target.value.length)}
                placeholder="Briefly describe what is included in this service..."
className={`${INPUT_CLASS} resize-none`}
/>
<CharCount value={newDescLength} max={240} />
            </div>

            <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
              {busyAction === "add" ? (
<Loader2 className="w-4 h-4 animate-spin" />
) : (
<Plus className="w-4 h-4" />
)}
{busyAction === "add" ? "Adding..." : "Add Service"}
            </button>
          </form>

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
                            isDragDisabled={isEditing || isBusy}
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
                                  <div
                                    className="space-y-3"
                                    onKeyDown={(e) =>
                                      handleEditKeyDown(e, service.id)
                                    }
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label htmlFor="bh-edit-title" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
Service Name
</label>
                                        <input
                                          autoFocus
                                          id="bh-edit-title"
 autoComplete="off"
 value={editTitle}
                                          maxLength={80}
                                          onChange={(e) =>
                                            setEditTitle(e.target.value)
                                          }
                                          placeholder="Service Name"
                                          className={EDIT_INPUT_CLASS}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label htmlFor="bh-edit-price" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
Price / Rate
</label>
                                        <input
                                          id="bh-edit-price"
 autoComplete="off"
 value={editPrice}
                                          maxLength={40}
                                          onChange={(e) =>
                                            setEditPrice(e.target.value)
                                          }
                                          placeholder="Price / Rate"
                                          className={EDIT_INPUT_CLASS}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label htmlFor="bh-edit-description" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
Description (Optional)
</label>
                                      <textarea
                                        rows={2}
                                        id="bh-edit-description"
 value={editDescription}
                                        maxLength={240}
                                        onChange={(e) =>
                                          setEditDescription(e.target.value)
                                        }
                                        placeholder="Short description..."
className={`${EDIT_INPUT_CLASS} resize-none`}
/>
<CharCount value={editDescription.length} max={240} />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={cancelEditing}
                                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() =>
                                          handleUpdateService(service.id)
                                        }
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
                                      >
                                        {busyAction === "update" ? (
<Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
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
                                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                                            {formatPriceDisplay(service.price)}
                                          </span>
                                        </div>
                                        {service.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 break-words">
                                            {service.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isConfirmingDelete ? (
                                        <>
                                          <span
 role="alert"
 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1"
 >
 Delete this service?
 </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteService(service.id)
                                            }
 disabled={isBusy}
 autoFocus
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
                                          >
                                            Yes, delete
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmDeleteId(null)
                                            }
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer ${FOCUS_RING}`}
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => startEditing(service)}
                                            className={`p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer ${FOCUS_RING}`}
                                            title="Edit service"
                                            aria-label={`Edit ${service.title}`}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmDeleteId(service.id)
                                            }
                                            className={`p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
                                            title="Delete service"
                                            aria-label={`Delete ${service.title}`}
 disabled={isBusy}
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

      {/* TAB 2: LOCATION & MAP */}
      {activeTab === "map" && (
        <form role="tabpanel" id="bh-panel-map" aria-labelledby="bh-tab-map"
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="map" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
<MapPin className="w-5 h-5 text-brand-500 shrink-0" />
Store Location & Map
</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Display your physical store, studio, or office address and an interactive Google Map on your card.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-location-address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Search Location / Address / Landmark
</label>
            <input
              id="bh-location-address"
 autoComplete="off"
 name="location_address"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. 435 Illang-illang St. Imus City, Cavite"
              className={INPUT_CLASS}
            />
            <p className="text-[11px] text-slate-400">
              Type your specific store name or address here to automatically generate the live Google Map below.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-map-embed" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Custom Google Maps Embed URL or iframe Code (Optional)
</label>
            <input
              id="bh-map-embed"
 autoComplete="off"
 spellCheck={false}
 name="map_embed_url"
              value={mapEmbedInput}
              onChange={(e) => setMapEmbedInput(e.target.value)}
              placeholder="https://www.google.com/maps/embed?pb=... or paste full <iframe> code"
              className={INPUT_CLASS}
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
                  className={`inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline rounded ${FOCUS_RING}`}
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

          <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
            {busyAction === "settings" && <Loader2 className="w-4 h-4 animate-spin" />}
            {busyAction === "settings" ? "Saving Map Settings..." : "Save Location & Map"}
          </button>
        </form>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <form role="tabpanel" id="bh-panel-appointments" aria-labelledby="bh-tab-appointments"
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="appointments" />
          <input type="hidden" name="booking_platform" value={bookingPlatform} />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
<Calendar className="w-5 h-5 text-brand-500 shrink-0" />
Appointment & Consultation Card
</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize a rich booking card so clients can schedule meetings, calls, or reservations directly from your profile.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <MousePointerClick className="w-4 h-4" />
              <span>{bookingClicks} Total Booking Clicks</span>
            </div>
          </div>

          <label className={`flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 cursor-pointer ${FOCUS_RING}`}>
            <input
              type="checkbox"
              name="booking_enabled"
              checked={bookingEnabled}
              onChange={(e) => setBookingEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Show Booking Card on Public Profile
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Displays a dedicated interactive booking card on your KonekTap profile.
              </p>
            </div>
          </label>

          <div className="space-y-2">
            <span id="bh-booking-type-label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
Meeting / Booking Type Icon
</span>
            <div
 role="radiogroup"
 aria-labelledby="bh-booking-type-label"
 className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
 >
              {BOOKING_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = bookingPlatform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    role="radio"
 aria-checked={isSelected}
 onClick={() => setBookingPlatform(platform.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${FOCUS_RING} ${
                      isSelected
                        ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-dark-950 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold leading-tight">
                      {platform.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="bh-booking-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Card Headline / CTA Title
</label>
              <input
                id="bh-booking-title"
 autoComplete="off"
 name="booking_title"
                maxLength={60}
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                placeholder="e.g. Schedule a Free 15-Min Discovery Call"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bh-booking-url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Booking / Calendar URL
</label>
              <input
                id="bh-booking-url"
 inputMode="url"
 autoComplete="off"
 spellCheck={false}
 name="booking_url"
                type="url"
                defaultValue={profile?.booking_url || ""}
                placeholder="https://calendly.com/your-username"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-booking-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Short Subtext / Expectations (Optional)
</label>
            <textarea
              id="bh-booking-description"
 name="booking_description"
              rows={2}
              maxLength={160}
              value={bookingDesc}
              onChange={(e) => setBookingDesc(e.target.value)}
              placeholder="e.g. Pick a time slot that works best for you to discuss your project requirements and quotation."
className={`${INPUT_CLASS} resize-none`}
/>
<CharCount value={bookingDesc.length} max={160} />
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Public Card Preview
            </span>
            <div className="p-5 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/15 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/20 border border-brand-100 dark:border-brand-400/30 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <SelectedBookingIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    Available for Booking
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 break-words">
                    {bookingTitle || "Book an Appointment"}
                  </h4>
                  {bookingDesc && (
                    <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed line-clamp-2 break-words max-w-md">
                      {bookingDesc}
                    </p>
                  )}
                </div>
              </div>
              <span className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shrink-0 shadow-md transition-colors">
                Schedule Now →
              </span>
            </div>
          </div>

          <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
            {busyAction === "settings" && <Loader2 className="w-4 h-4 animate-spin" />}
            {busyAction === "settings"
 ? "Saving Booking Settings..."
              : "Save Appointment Settings"}
          </button>
        </form>
      )}

      {/* TAB 4: PDF CATALOG / MENU WITH GOOGLE DRIVE AUTO-FORMATTER */}
      {activeTab === "catalog" && (
        <form role="tabpanel" id="bh-panel-catalog" aria-labelledby="bh-tab-catalog"
          onSubmit={handleSaveSettings}
          className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10"
        >
          <input type="hidden" name="section" value="catalog" />
          <input
            type="hidden"
            name="catalog_action_type"
            value={catalogActionType}
          />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
<FileText className="w-5 h-5 text-brand-500 shrink-0" />
Featured Catalog / Digital Menu Showcase
</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add a visual cover image and a direct link to your PDF brochure, restaurant menu, or rate sheet.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
              <MousePointerClick className="w-4 h-4" />
              <span>{catalogClicks} Total Catalog Opens</span>
            </div>
          </div>

          {gdriveNotice && (
            <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 shrink-0" />
                <span>{gdriveNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setGdriveNotice(null)}
                className={`p-1 opacity-70 hover:opacity-100 cursor-pointer ${FOCUS_RING}`}
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="bh-catalog-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Catalog / Menu Title
</label>
              <input
                id="bh-catalog-title"
 autoComplete="off"
 name="catalog_title"
                maxLength={60}
                value={catalogTitle}
                onChange={(e) => setCatalogTitle(e.target.value)}
                placeholder="e.g. 2026 Product Catalog & Price List"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <span id="bh-catalog-action-label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
Primary Button Action
</span>
              <div
 role="radiogroup"
 aria-labelledby="bh-catalog-action-label"
 className="grid grid-cols-2 gap-2"
 >
                <button
                  type="button"
                  role="radio"
 aria-checked={catalogActionType === "view"}
 onClick={() => handleCatalogActionChange("view")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${FOCUS_RING} transition ${
                    catalogActionType === "view"
                      ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Open & View
                </button>
                <button
                  type="button"
                  role="radio"
 aria-checked={catalogActionType === "download"}
 onClick={() => handleCatalogActionChange("download")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${FOCUS_RING} transition ${
                    catalogActionType === "download"
                      ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Direct Download
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-catalog-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Short Description (Optional)
</label>
            <textarea
              id="bh-catalog-description"
 name="catalog_description"
              rows={2}
              maxLength={160}
              value={catalogDesc}
              onChange={(e) => setCatalogDesc(e.target.value)}
              placeholder="e.g. Browse our complete menu, custom packages, and bulk pricing specifications."
className={`${INPUT_CLASS} resize-none`}
/>
<CharCount value={catalogDesc.length} max={160} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-catalog-cover" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
Cover Image URL (Supports Google Drive Image Share Links, Imgur, etc.)
</label>
            <input
              id="bh-catalog-cover"
 inputMode="url"
 autoComplete="off"
 spellCheck={false}
 name="catalog_cover_url"
              type="url"
              value={catalogCoverUrl}
              onChange={(e) => handleCatalogCoverUrlChange(e.target.value)}
              placeholder="Paste Google Drive image link or direct image URL..."
              className={INPUT_CLASS}
            />
            <p className="text-[11px] text-slate-400">
              Tip: Paste any public Google Drive image link and it will automatically convert into a direct thumbnail URL.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bh-catalog-pdf" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
PDF / Catalog Link (Auto-Formats Google Drive Links)
</label>
            <input
              id="bh-catalog-pdf"
 inputMode="url"
 autoComplete="off"
 spellCheck={false}
 name="catalog_pdf_url"
              type="url"
              value={catalogPdfUrl}
              onChange={(e) => handleCatalogPdfUrlChange(e.target.value)}
              placeholder="Paste Google Drive PDF share link or direct PDF URL..."
              className={INPUT_CLASS}
            />
            <p className="text-[11px] text-slate-400">
              Tip: Upload your PDF to Google Drive (set access to <strong>Anyone with the link</strong>) and paste the link here—we auto-convert it for instant viewing or direct download.
            </p>
          </div>

          {catalogPdfUrl && isSafeHttpUrl(catalogPdfUrl) && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">
                Resolved Link: {catalogPdfUrl}
              </span>
              <a
                href={catalogPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 rounded ${FOCUS_RING}`}
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
            {busyAction === "settings" && <Loader2 className="w-4 h-4 animate-spin" />}
            {busyAction === "settings" ? "Saving Catalog..." : "Save Catalog Settings"}
          </button>
        </form>
      )}
    </div>
  );
}