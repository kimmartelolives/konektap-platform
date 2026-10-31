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
  Star,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
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

export type GoogleReviewItem = {
  id: string;
  business_name: string;
  address: string;
  review_url: string;
  place_id?: string;
  rating?: number;
};

type PlaceSearchCandidate = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  category?: string;
  review_url: string;
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
    google_reviews?: GoogleReviewItem[] | null;
  };
}

type TabType = "services" | "map" | "appointments" | "catalog" | "reviews";
type BusyAction = "add" | "update" | "delete" | "reorder" | "settings" | null;

const MAX_GOOGLE_REVIEWS = 6;
const SERVICE_PAGE_SIZES = [10, 25, 50] as const;
const MAX_PRICE = 99999999;
const SERVICE_TITLE_MAX = 80;
const BOOKING_TITLE_MAX = 60;
const CATALOG_TITLE_MAX = 60;

const BOOKING_PLATFORMS = [
  { id: "calendar", label: "Calendly / Cal.com", icon: Calendar },
  { id: "video", label: "Zoom / Google Meet", icon: Video },
  { id: "phone", label: "Phone / Discovery Call", icon: Phone },
  { id: "inperson", label: "In-Person / Studio Visit", icon: Users },
] as const;

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

type PriceMode = "exact" | "range";

function formatPesos(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Reads "1500-3000", "1500 - 3000" or "₱1,500 – ₱3,000" back into its two numbers
function parsePriceRange(priceStr: string): { min: string; max: string } | null {
  const cleaned = priceStr.replace(/[₱,\s]/g, "");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)[-–—](\d+(?:\.\d+)?)$/);
  return match ? { min: match[1], max: match[2] } : null;
}

// Validates a min/max pair and builds the text that gets saved, e.g. "₱1,500 – ₱3,000"
function buildPriceRange(
  minStr: string,
  maxStr: string
): { price?: string; error?: string } {
  if (!minStr.trim() || !maxStr.trim()) {
    return { error: "Enter both a minimum and a maximum price." };
  }
  const min = Number(minStr);
  const max = Number(maxStr);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
    return { error: "Price range must be valid numbers (0 or higher)." };
  }
  if (min > MAX_PRICE || max > MAX_PRICE) {
    return {
      error: `Prices can't be higher than ${formatPesos(MAX_PRICE)}.`,
    };
  }
  if (min >= max) {
    return { error: "The maximum price must be higher than the minimum." };
  }
  return { price: `${formatPesos(min)} – ${formatPesos(max)}` };
}

function formatPriceDisplay(priceStr: string): string {
  if (!priceStr) return "";
  const trimmed = priceStr.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return formatPesos(Number(trimmed));
  }
  const range = parsePriceRange(trimmed);
  if (range) {
    return `${formatPesos(Number(range.min))} – ${formatPesos(Number(range.max))}`;
  }
  return trimmed;
}

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

// Helper: Auto-convert Place ID, Maps links, CID, or business info to Direct Google Review URL
function resolveGoogleReviewUrl(rawInput: string, businessName: string): string {
  const trimmed = rawInput.trim();

  // 1. Kung Place ID ang inilagay nang direkta (nagsisimula sa ChIJ)
  if (/^ChI[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return `https://search.google.com/local/writereview?placeid=${trimmed}`;
  }

  // 2. Kung may placeid parameter sa URL
  const placeIdParam = trimmed.match(/[?&]placeid=([a-zA-Z0-9_-]+)/i);
  if (placeIdParam?.[1]) {
    return `https://search.google.com/local/writereview?placeid=${placeIdParam[1]}`;
  }

  // 3. Kung may nakapaloob na ChIJ Place ID sa loob ng mahabang URL string
  const embeddedPlaceId = trimmed.match(/(ChIJ[a-zA-Z0-9_-]{15,})/);
  if (embeddedPlaceId?.[1]) {
    return `https://search.google.com/local/writereview?placeid=${embeddedPlaceId[1]}`;
  }

  // 4. Kung short review link mula sa Google Business Profile (g.page/.../review)
  if (trimmed.includes("g.page") || trimmed.includes("/review")) {
    return isSafeHttpUrl(trimmed) ? trimmed : `https://${trimmed.replace(/^https?:\/\//, "")}`;
  }

  // 5. Kung may Google Customer ID (CID / lrd parameter)
  const lrdMatch = trimmed.match(/[?&]lrd=([0-9a-zA-Z:,_-]+)/i);
  if (lrdMatch?.[1]) {
    const parts = lrdMatch[1].split(",");
    return `https://search.google.com/local/writereview?placeid=${parts[0]}`;
  }

  // 6. Kung plain Google Maps link na may place name, i-format gamit ang action parameter
  if (isSafeHttpUrl(trimmed)) {
    try {
      const urlObj = new URL(trimmed);
      if (urlObj.hostname.includes("google.com")) {
        const query = urlObj.searchParams.get("query") || urlObj.searchParams.get("q");
        if (query) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${query}`;
        }
      }
    } catch {
      // Fall through kung may error sa parsing
    }
    return trimmed;
  }

  // 7. Fallback: Search directed with review prompt intent
  const targetName = trimmed || businessName;
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${targetName} write a review`
  )}`;
}

// Page numbers with gaps, e.g. 1 … 4 5 6 … 12
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

function isPlainNumber(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value);
}

// Returns an error message, or null when the exact price is fine
function validateExactPrice(value: string): string | null {
  if (!isPlainNumber(value)) return "Price must be a number, e.g. 15000.";
  if (Number(value) > MAX_PRICE) {
    return `Price can't be higher than ${formatPesos(MAX_PRICE)}.`;
  }
  return null;
}

// type="number" still accepts e, +, and -, so keep prices to digits and a decimal point
function blockNonNumericKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
}

function PriceModeToggle({
  value,
  onChange,
}: {
  value: PriceMode;
  onChange: (mode: PriceMode) => void;
}) {
  const options: { id: PriceMode; label: string }[] = [
    { id: "exact", label: "Exact" },
    { id: "range", label: "Range" },
  ];
  return (
    <div
      role="group"
      aria-label="Price type"
      className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-white/5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={`inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${FOCUS_RING} ${
            value === option.id
              ? "bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function PriceRangeInputs({
  idPrefix,
  min,
  max,
  onMinChange,
  onMaxChange,
  inputClass,
}: {
  idPrefix: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  inputClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"
          aria-hidden="true"
        >
          ₱
        </span>
        <input
          id={`${idPrefix}-min`}
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_PRICE}
          step="any"
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
          onKeyDown={blockNonNumericKeys}
          placeholder="Min"
          aria-label="Minimum price"
          autoComplete="off"
          className={`${inputClass} pl-7`}
        />
      </div>
      <span className="text-xs text-slate-400 shrink-0" aria-hidden="true">
        to
      </span>
      <div className="relative flex-1 min-w-0">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"
          aria-hidden="true"
        >
          ₱
        </span>
        <input
          id={`${idPrefix}-max`}
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_PRICE}
          step="any"
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          onKeyDown={blockNonNumericKeys}
          placeholder="Max"
          aria-label="Maximum price"
          autoComplete="off"
          className={`${inputClass} pl-7`}
        />
      </div>
    </div>
  );
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
  const [newTitleLength, setNewTitleLength] = useState(0);

  // Services pagination
  const [servicePageSize, setServicePageSize] = useState<number>(10);
  const [servicePage, setServicePage] = useState(1);

  // Price type for the "Add service" form and the inline editor
  const [priceMode, setPriceMode] = useState<PriceMode>("exact");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [editPriceMode, setEditPriceMode] = useState<PriceMode>("exact");
  const [editRangeMin, setEditRangeMin] = useState("");
  const [editRangeMax, setEditRangeMax] = useState("");
  const rangePreview =
    priceMode === "range" ? buildPriceRange(rangeMin, rangeMax).price : undefined;

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

  // GOOGLE REVIEWS STATES (Max 6 businesses)
  const [googleReviews, setGoogleReviews] = useState<GoogleReviewItem[]>(
    Array.isArray(profile?.google_reviews) ? profile.google_reviews : []
  );
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [searchCandidates, setSearchCandidates] = useState<PlaceSearchCandidate[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<PlaceSearchCandidate | null>(null);
  const [customReviewUrlOrPlaceId, setCustomReviewUrlOrPlaceId] = useState("");

  // Services pagination (safe page keeps us in range after deletes or a refresh)
  const serviceTotalPages = Math.max(
    1,
    Math.ceil(services.length / servicePageSize)
  );
  const safeServicePage = Math.min(servicePage, serviceTotalPages);
  const serviceStartIndex = (safeServicePage - 1) * servicePageSize;
  const currentServices = services.slice(
    serviceStartIndex,
    serviceStartIndex + servicePageSize
  );
  const serviceRangeStart = services.length === 0 ? 0 : serviceStartIndex + 1;
  const serviceRangeEnd = Math.min(
    serviceStartIndex + servicePageSize,
    services.length
  );

  const debouncedAddress = useDebouncedValue(locationAddress, 600);
  const debouncedEmbed = useDebouncedValue(mapEmbedInput, 600);
  const debouncedBusinessQuery = useDebouncedValue(businessSearchQuery, 450);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  useEffect(() => {
    if (Array.isArray(profile?.google_reviews)) {
      setGoogleReviews(profile.google_reviews);
    }
  }, [profile?.google_reviews]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 4000 : 8000
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmDeleteId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDeleteId]);

  useEffect(() => {
    if (!gdriveNotice) return;
    const timer = setTimeout(() => setGdriveNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [gdriveNotice]);

  // Smart Search Effect para sa Google Business Lookup
  useEffect(() => {
    const q = debouncedBusinessQuery.trim();
    if (q.length < 2) {
      setSearchCandidates([]);
      setIsSearchingPlaces(false);
      return;
    }

    let cancelled = false;
    setIsSearchingPlaces(true);

    fetch(`/api/places/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSearchCandidates(Array.isArray(data.results) ? data.results : []);
        }
      })
      .catch(() => {
        if (!cancelled) setSearchCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearchingPlaces(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedBusinessQuery]);

  const tabs = [
    { id: "services", label: "Services & Pricing", icon: Briefcase },
    { id: "map", label: "Location & Map", icon: MapPin },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "catalog", label: "PDF Catalog / Menu", icon: FileText },
    { id: "reviews", label: "Google Reviews", icon: Star },
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

  // GOOGLE REVIEW HANDLERS
  function handleConfirmAddReviewBusiness() {
    if (!selectedCandidate) return;
    if (googleReviews.length >= MAX_GOOGLE_REVIEWS) {
      setFeedback({
        type: "error",
        message: `Hanggang ${MAX_GOOGLE_REVIEWS} na negosyo lamang ang pwedeng ilagay.`,
      });
      return;
    }

    const finalReviewUrl = customReviewUrlOrPlaceId.trim()
      ? resolveGoogleReviewUrl(customReviewUrlOrPlaceId, selectedCandidate.name)
      : selectedCandidate.review_url;

    const newItem: GoogleReviewItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      business_name: selectedCandidate.name,
      address: selectedCandidate.address,
      review_url: finalReviewUrl,
      place_id: selectedCandidate.place_id,
      rating: selectedCandidate.rating,
    };

    const nextReviews = [...googleReviews, newItem];
    setGoogleReviews(nextReviews);
    setSelectedCandidate(null);
    setBusinessSearchQuery("");
    setSearchCandidates([]);
    setCustomReviewUrlOrPlaceId("");

    saveGoogleReviewsToServer(nextReviews, "Google Review link added and saved!");
  }

  function handleRemoveReviewBusiness(id: string) {
    const nextReviews = googleReviews.filter((item) => item.id !== id);
    setGoogleReviews(nextReviews);
    saveGoogleReviewsToServer(nextReviews, "Google Review link removed.");
  }

  function saveGoogleReviewsToServer(
    updatedList: GoogleReviewItem[],
    successMsg: string
  ) {
    setFeedback(null);
    setBusyAction("settings");

    const formData = new FormData();
    formData.append("section", "reviews");
    formData.append("google_reviews", JSON.stringify(updatedList));

    startTransition(async () => {
      try {
        const result = await updateBusinessSettings(formData);
        if (result?.error) {
          setFeedback({ type: "error", message: result.error });
          return;
        }
        setFeedback({ type: "success", message: successMsg });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not save Google Reviews. Please try again.",
        });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function goToServicePage(page: number) {
    setServicePage(Math.min(Math.max(1, page), serviceTotalPages));
    // An open editor or delete confirmation belongs to a row that may be hidden now
    setEditingId(null);
    setConfirmDeleteId(null);
  }

  function handleServicePageSizeChange(size: number) {
    setServicePageSize(size);
    setServicePage(1);
    setEditingId(null);
    setConfirmDeleteId(null);
  }

  function startEditing(service: ServiceItem) {
    setEditingId(service.id);
    setEditTitle(service.title);
    // The exact price field is numbers only, so older text prices start empty
    setEditPrice(isPlainNumber(service.price.trim()) ? service.price.trim() : "");
    // Saved ranges (e.g. "₱1,500 – ₱3,000") open in range mode
    const range = parsePriceRange(service.price);
    setEditPriceMode(range ? "range" : "exact");
    setEditRangeMin(range?.min ?? "");
    setEditRangeMax(range?.max ?? "");
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
    if (isBusy) return;
    setFeedback(null);
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    const title = String(formData.get("title") || "").trim();
    if (!title) {
      setFeedback({ type: "error", message: "Service name is required." });
      return;
    }
    if (title.length > SERVICE_TITLE_MAX) {
      setFeedback({
        type: "error",
        message: `Service name can't be longer than ${SERVICE_TITLE_MAX} characters.`,
      });
      return;
    }
    formData.set("title", title);

    if (priceMode === "exact") {
      const exactPrice = String(formData.get("price") || "").trim();
      const priceError = validateExactPrice(exactPrice);
      if (priceError) {
        setFeedback({ type: "error", message: priceError });
        return;
      }
      formData.set("price", exactPrice);
    }

    if (priceMode === "range") {
      const range = buildPriceRange(rangeMin, rangeMax);
      if (!range.price) {
        setFeedback({
          type: "error",
          message: range.error ?? "Enter a valid price range.",
        });
        return;
      }
      formData.set("price", range.price);
    }

    formData.append("position", services.length.toString());
    // New services are added at the end, so jump to the page where it will appear
    const pageOfNewService = Math.max(
      1,
      Math.ceil((services.length + 1) / servicePageSize)
    );
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
        setNewTitleLength(0);
        setPriceMode("exact");
        setRangeMin("");
        setRangeMax("");
        setServicePage(pageOfNewService);
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
    if (
      !editTitle.trim() ||
      (editPriceMode === "exact" && !editPrice.trim())
    ) {
      setFeedback({
        type: "error",
        message: "Service name and price are required.",
      });
      return;
    }

    if (editTitle.trim().length > SERVICE_TITLE_MAX) {
      setFeedback({
        type: "error",
        message: `Service name can't be longer than ${SERVICE_TITLE_MAX} characters.`,
      });
      return;
    }

    let finalPrice = editPrice.trim();
    if (editPriceMode === "exact") {
      const priceError = validateExactPrice(finalPrice);
      if (priceError) {
        setFeedback({ type: "error", message: priceError });
        return;
      }
    }
    if (editPriceMode === "range") {
      const range = buildPriceRange(editRangeMin, editRangeMax);
      if (!range.price) {
        setFeedback({
          type: "error",
          message: range.error ?? "Enter a valid price range.",
        });
        return;
      }
      finalPrice = range.price;
    }

    setFeedback(null);
    const formData = new FormData();
    formData.append("id", id);
    formData.append("title", editTitle.trim());
    formData.append("price", finalPrice);
    formData.append("description", editDescription.trim());

    const previous = services;
    setServices((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editTitle.trim(),
              price: finalPrice,
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
    if (isBusy) return;
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    // The drag indexes are relative to the current page, so convert them to
    // positions in the full list before reordering
    const fromIndex = serviceStartIndex + result.source.index;
    const toIndex = serviceStartIndex + result.destination.index;

    const previous = services;
    const items = Array.from(services);
    const [reorderedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, reorderedItem);

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

      const headline = String(formData.get("booking_title") || "").trim();
      if (headline.length > BOOKING_TITLE_MAX) {
        setFeedback({
          type: "error",
          message: `Card headline can't be longer than ${BOOKING_TITLE_MAX} characters.`,
        });
        return;
      }
      formData.set("booking_title", headline);
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

      const catalogHeading = String(formData.get("catalog_title") || "").trim();
      if (catalogHeading.length > CATALOG_TITLE_MAX) {
        setFeedback({
          type: "error",
          message: `Catalog title can't be longer than ${CATALOG_TITLE_MAX} characters.`,
        });
        return;
      }
      formData.set("catalog_title", catalogHeading);
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Google Review Links
            </p>
            <p className="text-2xl font-display font-bold text-amber-500 mt-0.5">
              {googleReviews.length}/{MAX_GOOGLE_REVIEWS}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-500" />
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
        <div
          role="tabpanel"
          id="bh-panel-services"
          aria-labelledby="bh-tab-services"
          className="space-y-6"
        >
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
                <label
                  htmlFor="bh-service-title"
                  className="flex items-center min-h-[28px] text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Service Name
                </label>
                <input
                  id="bh-service-title"
                  autoComplete="off"
                  name="title"
                  required
                  maxLength={SERVICE_TITLE_MAX}
                  onChange={(e) => setNewTitleLength(e.target.value.length)}
                  placeholder="e.g. Full Web Application Setup"
                  className={INPUT_CLASS}
                />
                <CharCount value={newTitleLength} max={SERVICE_TITLE_MAX} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 min-h-[28px]">
                  <label
                    htmlFor={
                      priceMode === "exact"
                        ? "bh-service-price"
                        : "bh-service-price-min"
                    }
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Price / Rate
                  </label>
                  <PriceModeToggle value={priceMode} onChange={setPriceMode} />
                </div>
                {priceMode === "exact" ? (
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"
                      aria-hidden="true"
                    >
                      ₱
                    </span>
                    <input
                      id="bh-service-price"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={MAX_PRICE}
                      step="any"
                      autoComplete="off"
                      name="price"
                      required
                      onKeyDown={blockNonNumericKeys}
                      placeholder="e.g. 15000"
                      className={`${INPUT_CLASS} pl-7`}
                    />
                  </div>
                ) : (
                  <>
                    <PriceRangeInputs
                      idPrefix="bh-service-price"
                      min={rangeMin}
                      max={rangeMax}
                      onMinChange={setRangeMin}
                      onMaxChange={setRangeMax}
                      inputClass={INPUT_CLASS}
                    />
                    {rangePreview && (
                      <p className="text-[11px] text-slate-400">
                        Shows as {rangePreview}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bh-service-description"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
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
                  {serviceTotalPages > 1
                    ? "Drag to reorder within this page"
                    : "Drag to reorder"}
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

                      {currentServices.map((service, index) => {
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
                                        <label
                                          htmlFor="bh-edit-title"
                                          className="flex items-center min-h-[28px] text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                                        >
                                          Service Name
                                        </label>
                                        <input
                                          autoFocus
                                          id="bh-edit-title"
                                          autoComplete="off"
                                          value={editTitle}
                                          maxLength={SERVICE_TITLE_MAX}
                                          onChange={(e) =>
                                            setEditTitle(e.target.value)
                                          }
                                          placeholder="Service Name"
                                          className={EDIT_INPUT_CLASS}
                                        />
                                        <CharCount
                                          value={editTitle.length}
                                          max={SERVICE_TITLE_MAX}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2 min-h-[28px]">
                                          <label
                                            htmlFor={
                                              editPriceMode === "exact"
                                                ? "bh-edit-price"
                                                : "bh-edit-price-min"
                                            }
                                            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                                          >
                                            Price / Rate
                                          </label>
                                          <PriceModeToggle
                                            value={editPriceMode}
                                            onChange={setEditPriceMode}
                                          />
                                        </div>
                                        {editPriceMode === "exact" ? (
                                          <div className="relative">
                                            <span
                                              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"
                                              aria-hidden="true"
                                            >
                                              ₱
                                            </span>
                                            <input
                                              id="bh-edit-price"
                                              type="number"
                                              inputMode="decimal"
                                              min={0}
                                              max={MAX_PRICE}
                                              step="any"
                                              autoComplete="off"
                                              value={editPrice}
                                              onChange={(e) =>
                                                setEditPrice(e.target.value)
                                              }
                                              onKeyDown={blockNonNumericKeys}
                                              placeholder="e.g. 15000"
                                              className={`${EDIT_INPUT_CLASS} pl-7`}
                                            />
                                          </div>
                                        ) : (
                                          <PriceRangeInputs
                                            idPrefix="bh-edit-price"
                                            min={editRangeMin}
                                            max={editRangeMax}
                                            onMinChange={setEditRangeMin}
                                            onMaxChange={setEditRangeMax}
                                            inputClass={EDIT_INPUT_CLASS}
                                          />
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label
                                        htmlFor="bh-edit-description"
                                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                                      >
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
                                      <CharCount
                                        value={editDescription.length}
                                        max={240}
                                      />
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
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed`}
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
                                          <h4
                                            className="max-w-full text-sm font-bold text-slate-900 dark:text-white line-clamp-2 break-words"
                                            title={service.title}
                                          >
                                            {service.title}
                                          </h4>
                                          <span
                                            className="max-w-full truncate px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap"
                                            title={formatPriceDisplay(service.price)}
                                          >
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
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed`}
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
                                            className={`p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer ${FOCUS_RING} disabled:opacity-60 disabled:cursor-not-allowed`}
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

            {/* PAGINATION */}
            {isMounted && services.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {serviceRangeStart}–{serviceRangeEnd}
                    </span>{" "}
                    of {services.length}
                  </p>
                  <label htmlFor="bh-service-page-size" className="sr-only">
                    Services per page
                  </label>
                  <select
                    id="bh-service-page-size"
                    value={servicePageSize}
                    onChange={(e) =>
                      handleServicePageSizeChange(Number(e.target.value))
                    }
                    className={`px-2.5 py-1 rounded-lg bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 cursor-pointer ${FOCUS_RING}`}
                  >
                    {SERVICE_PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>

                {serviceTotalPages > 1 && (
                  <nav
                    className="flex items-center gap-1.5"
                    aria-label="Services pagination"
                  >
                    <button
                      type="button"
                      onClick={() => goToServicePage(safeServicePage - 1)}
                      disabled={safeServicePage === 1}
                      aria-label="Previous page"
                      className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer ${FOCUS_RING}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPageItems(safeServicePage, serviceTotalPages).map(
                      (item, i) =>
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
                            onClick={() => goToServicePage(item)}
                            aria-label={`Page ${item}`}
                            aria-current={
                              item === safeServicePage ? "page" : undefined
                            }
                            className={`min-w-9 h-9 px-2 rounded-xl text-xs font-semibold tabular-nums transition cursor-pointer ${FOCUS_RING} ${
                              item === safeServicePage
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
                      onClick={() => goToServicePage(safeServicePage + 1)}
                      disabled={safeServicePage === serviceTotalPages}
                      aria-label="Next page"
                      className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer ${FOCUS_RING}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </nav>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOCATION & MAP */}
      {activeTab === "map" && (
        <form
          role="tabpanel"
          id="bh-panel-map"
          aria-labelledby="bh-tab-map"
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
            <label
              htmlFor="bh-location-address"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Search Location / Address / Landmark
            </label>
            <input
              id="bh-location-address"
              autoComplete="off"
              name="location_address"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. General Trias, Cavite"
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bh-map-embed"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
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
            {busyAction === "settings" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {busyAction === "settings"
              ? "Saving Map Settings..."
              : "Save Location & Map"}
          </button>
        </form>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <form
          role="tabpanel"
          id="bh-panel-appointments"
          aria-labelledby="bh-tab-appointments"
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
          </div>

          <label
            className={`flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 cursor-pointer ${FOCUS_RING}`}
          >
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
            <span
              id="bh-booking-type-label"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
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
              <label
                htmlFor="bh-booking-title"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Card Headline / CTA Title
              </label>
              <input
                id="bh-booking-title"
                autoComplete="off"
                name="booking_title"
                maxLength={BOOKING_TITLE_MAX}
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                placeholder="e.g. Schedule a Free 15-Min Discovery Call"
                className={INPUT_CLASS}
              />
              <CharCount value={bookingTitle.length} max={BOOKING_TITLE_MAX} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bh-booking-url"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
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
            <label
              htmlFor="bh-booking-description"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Short Subtext / Expectations (Optional)
            </label>
            <textarea
              id="bh-booking-description"
              name="booking_description"
              rows={2}
              maxLength={160}
              value={bookingDesc}
              onChange={(e) => setBookingDesc(e.target.value)}
              placeholder="e.g. Pick a time slot that works best for you..."
              className={`${INPUT_CLASS} resize-none`}
            />
            <CharCount value={bookingDesc.length} max={160} />
          </div>

          <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
            {busyAction === "settings" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {busyAction === "settings"
              ? "Saving Booking Settings..."
              : "Save Appointment Settings"}
          </button>
        </form>
      )}

      {/* TAB 4: PDF CATALOG / MENU */}
      {activeTab === "catalog" && (
        <form
          role="tabpanel"
          id="bh-panel-catalog"
          aria-labelledby="bh-tab-catalog"
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
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="bh-catalog-title"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Catalog / Menu Title
              </label>
              <input
                id="bh-catalog-title"
                autoComplete="off"
                name="catalog_title"
                maxLength={CATALOG_TITLE_MAX}
                value={catalogTitle}
                onChange={(e) => setCatalogTitle(e.target.value)}
                placeholder="e.g. 2026 Product Catalog & Price List"
                className={INPUT_CLASS}
              />
              <CharCount value={catalogTitle.length} max={CATALOG_TITLE_MAX} />
            </div>

            <div className="space-y-1.5">
              <span
                id="bh-catalog-action-label"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
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
            <label
              htmlFor="bh-catalog-description"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
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
            <label
              htmlFor="bh-catalog-cover"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Cover Image URL
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
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bh-catalog-pdf"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              PDF / Catalog Link (Auto-Formats Google Drive File Links)
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
              placeholder="Paste Google Drive PDF file link (e.g. drive.google.com/file/d/...)"
              className={INPUT_CLASS}
            />
          </div>

          <button type="submit" disabled={isBusy} className={SUBMIT_BTN_CLASS}>
            {busyAction === "settings" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {busyAction === "settings"
              ? "Saving Catalog..."
              : "Save Catalog Settings"}
          </button>
        </form>
      )}

      {/* TAB 5: GOOGLE REVIEWS HUB (PREMIUM - UP TO 6 BUSINESSES) */}
      {activeTab === "reviews" && (
        <div
          role="tabpanel"
          id="bh-panel-reviews"
          aria-labelledby="bh-tab-reviews"
          className="space-y-6"
        >
          <div className="glass-card p-6 rounded-3xl shadow-xl space-y-5 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                  Google Business Review Finder
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search your business name below, verify your branch/location details, and click <strong>Add Business</strong> to automatically generate a direct Google Review card on your public profile (up to {MAX_GOOGLE_REVIEWS} businesses).
                </p>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  googleReviews.length >= MAX_GOOGLE_REVIEWS
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
                }`}
              >
                {googleReviews.length} / {MAX_GOOGLE_REVIEWS} Businesses Added
              </span>
            </div>

            {/* STEP 1: SEARCH TEXTBOX */}
            <div className="space-y-2">
              <label
                htmlFor="bh-google-review-search"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                1. Search Your Business Name & City
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="bh-google-review-search"
                  type="search"
                  disabled={googleReviews.length >= MAX_GOOGLE_REVIEWS}
                  value={businessSearchQuery}
                  onChange={(e) => {
                    setBusinessSearchQuery(e.target.value);
                    setSelectedCandidate(null);
                  }}
                  placeholder="e.g. Taven Coffee General Trias or Akami Sushi Cavite..."
                  className={`${INPUT_CLASS} pl-10 pr-10`}
                />
                {isSearchingPlaces && (
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* STEP 2: MATCHING RESULTS */}
            {searchCandidates.length > 0 && !selectedCandidate && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Select Your Matching Business
                </p>
                <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {searchCandidates.map((candidate) => (
                    <button
                      key={candidate.place_id}
                      type="button"
                      onClick={() => setSelectedCandidate(candidate)}
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-dark-950/70 hover:border-amber-500/60 hover:bg-amber-500/5 text-left transition-all flex items-start justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                              {candidate.name}
                            </h4>
                            {candidate.rating && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {candidate.rating}
                                {candidate.user_ratings_total
                                  ? ` (${candidate.user_ratings_total})`
                                  : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {candidate.address}
                          </p>
                          {candidate.category && (
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {candidate.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        Select →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRMATION & AUTO-GENERATED REVIEW LINK */}
            {selectedCandidate && (
              <div className="p-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                      <Star className="w-6 h-6 fill-slate-950" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Confirm Business Details
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedCandidate.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedCandidate.address}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    title="Change business"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Optional: Paste Google Place ID or Direct Google Review Link (leave blank to auto-generate)
                  </label>
                  <input
                    type="text"
                    value={customReviewUrlOrPlaceId}
                    onChange={(e) => setCustomReviewUrlOrPlaceId(e.target.value)}
                    placeholder="Auto-generated from Google Business Search (or paste ChIJ... Place ID)"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <a
                    href={
                      customReviewUrlOrPlaceId.trim()
                        ? resolveGoogleReviewUrl(
                            customReviewUrlOrPlaceId,
                            selectedCandidate.name
                          )
                        : selectedCandidate.review_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <span>Test Generated Review Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCandidate(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleConfirmAddReviewBusiness}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                    >
                      {busyAction === "settings" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>Add & Save Review Link</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SAVED GOOGLE REVIEW BUSINESSES LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Google Review Cards ({googleReviews.length}/{MAX_GOOGLE_REVIEWS})
              </h4>
            </div>

            {googleReviews.length === 0 ? (
              <div className="glass-card p-10 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Google Review links added yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Search your business name above to add up to 6 Google Review cards to your public profile.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {googleReviews.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1 text-amber-400">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                            />
                          ))}
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                            Google Reviews
                          </span>
                        </div>
                        <h4 className="font-bold text-sm md:text-base text-slate-900 dark:text-white truncate">
                          {item.business_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.address}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemoveReviewBusiness(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Remove business review link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[11px] text-slate-400 truncate">
                        {item.review_url}
                      </span>
                      <a
                        href={item.review_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}