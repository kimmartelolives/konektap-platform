"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  FileText,
  MapPin,
  Video,
  Phone,
  Users,
  Sparkles,
  ArrowUpRight,
  Download,
  Eye,
  ExternalLink,
  Star,
  X,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { trackBusinessHubClick } from "@/app/dashboard/business/actions";
import type { GoogleReviewItem } from "@/components/dashboard/business-hub-manager";

type ServiceItem = {
  id: string;
  title: string;
  price: string;
  description: string | null;
};

interface BusinessHubDisplayProps {
  profile: {
    id: string;
    tier?: string | null;
    button_shape?: string | null;
    location_address?: string | null;
    map_embed_url?: string | null;
    booking_enabled?: boolean | null;
    booking_url?: string | null;
    booking_title?: string | null;
    booking_description?: string | null;
    booking_platform?: string | null;
    catalog_title?: string | null;
    catalog_description?: string | null;
    catalog_pdf_url?: string | null;
    catalog_cover_url?: string | null;
    catalog_action_type?: string | null;
    google_reviews?: GoogleReviewItem[] | null;
  };
  services: ServiceItem[];
}

const BOOKING_ICONS: Record<string, React.ElementType> = {
  calendar: Calendar,
  video: Video,
  phone: Phone,
  inperson: Users,
};

const BOOKING_LABELS: Record<string, string> = {
  calendar: "Online Scheduling",
  video: "Video Consultation",
  phone: "Discovery Call",
  inperson: "In-Studio / On-Site",
};

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

// Ensure Google Drive file links always resolve to direct download when "download" is selected
function getResolvedCatalogHref(url: string, isDownload: boolean): string {
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;

  const fileIdMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (fileIdMatch?.[1]) {
    return isDownload
      ? `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`
      : `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
  }

  return trimmed;
}

export function BusinessHubDisplay({
  profile,
  services,
}: BusinessHubDisplayProps) {
  // Service shown in the details popup (null = closed)
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // While the popup is open: Escape closes it, the page behind can't scroll,
  // and focus goes back to the card that opened it
  useEffect(() => {
    if (!activeService) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveService(null);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [activeService]);

  if (profile.tier !== "premium") return null;

  const shapeClass = profile.button_shape || "rounded-2xl";

  let mapSrc = profile.map_embed_url;
  if (!mapSrc && profile.location_address) {
    mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
      profile.location_address
    )}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  const googleReviews = Array.isArray(profile.google_reviews)
    ? profile.google_reviews.slice(0, 6)
    : [];

  const hasServices = services && services.length > 0;
  const hasMap = !!mapSrc;
  const hasAppointments = !!(profile.booking_enabled && profile.booking_url);
  const hasCatalog = !!profile.catalog_pdf_url;
  const hasReviews = googleReviews.length > 0;

  if (!hasServices && !hasMap && !hasAppointments && !hasCatalog && !hasReviews) {
    return null;
  }

  const BookingIcon =
    BOOKING_ICONS[profile.booking_platform || "calendar"] || Calendar;
  const bookingBadgeLabel =
    BOOKING_LABELS[profile.booking_platform || "calendar"] ||
    "Available for Booking";
  const isDownloadCatalog = profile.catalog_action_type === "download";
  const resolvedCatalogUrl = profile.catalog_pdf_url
    ? getResolvedCatalogHref(profile.catalog_pdf_url, isDownloadCatalog)
    : "";

  function handleTrackClick(type: "booking" | "catalog") {
    if (!profile.id) return;
    trackBusinessHubClick(profile.id, type);
  }

  return (
    <div className="w-full space-y-8 mt-4">
      {/* 1. SERVICES & PRICING SECTION */}
      {hasServices && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Services & Rates
            </h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setActiveService(service)}
                aria-haspopup="dialog"
                className={`group w-full text-left p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/40 transition-all flex flex-col justify-between gap-2 overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900 ${shapeClass}`}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="font-bold text-slate-900 dark:text-white text-sm md:text-base line-clamp-2 break-words flex-1 min-w-0">
                    {service.title}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    {formatPriceDisplay(service.price)}
                  </span>
                </span>
                {service.description && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 break-words">
                    {service.description}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                  View details
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SERVICE DETAILS POPUP (bottom sheet on phones, centered card on larger screens) */}
      {activeService &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-details-title"
            onClick={() => setActiveService(null)}
          >
            <div
              className="relative flex flex-col w-full sm:max-w-lg max-h-[90vh] overflow-hidden bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-t-3xl sm:rounded-3xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Soft glow, same look as the booking card */}
              <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-brand-500/10 dark:bg-brand-500/20 blur-3xl pointer-events-none" />

              {/* Drag-handle look for the phone bottom sheet */}
              <div className="sm:hidden mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-white/20" />

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setActiveService(null)}
                aria-label="Close service details"
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100/80 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Scrollable content */}
              <div className="relative overflow-y-auto p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4 pr-10">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-50 dark:bg-brand-500/15 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                      Service
                    </p>
                    <h3
                      id="service-details-title"
                      className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 dark:text-white break-words"
                    >
                      {activeService.title}
                    </h3>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/80 dark:text-emerald-400/80">
                    Price / Rate
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 break-words">
                    {formatPriceDisplay(activeService.price)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    About this service
                  </p>
                  {activeService.description ? (
                    <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                      {activeService.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      No extra details were added for this service.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions stay visible even when the description is long */}
              <div
                className="relative shrink-0 flex flex-col-reverse sm:flex-row gap-3 px-6 sm:px-8 pt-4 border-t border-slate-100 dark:border-white/10 bg-white/80 dark:bg-dark-900/80 backdrop-blur"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <button
                  type="button"
                  onClick={() => setActiveService(null)}
                  className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                >
                  Close
                </button>
                {hasAppointments && (
                  <a
                    href={profile.booking_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleTrackClick("booking")}
                    className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-brand-600 dark:hover:bg-brand-500 shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                  >
                    <span>Schedule Now</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. FEATURED APPOINTMENTS & DIGITAL CATALOG SHOWCASE */}
      {(hasAppointments || hasCatalog) && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Bookings & Resources
            </h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-1 gap-5">
            {hasAppointments && (
              <a
                href={profile.booking_url!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleTrackClick("booking")}
                className={`group relative overflow-hidden p-5 md:p-6 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-brand-400 dark:hover:border-brand-500/50 transition-all block ${shapeClass}`}
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-500/5 dark:bg-brand-500/20 blur-2xl pointer-events-none group-hover:bg-brand-500/10 dark:group-hover:bg-brand-500/30 transition-all" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`w-14 h-14 bg-slate-50 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/15 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ${shapeClass}`}
                    >
                      <BookingIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{bookingBadgeLabel}</span>
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white line-clamp-2 break-words">
                        {profile.booking_title || "Book an Appointment"}
                      </h3>
                      {profile.booking_description && (
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-relaxed line-clamp-2 break-words">
                          {profile.booking_description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 group-hover:bg-brand-600 dark:group-hover:bg-brand-500 font-bold text-xs md:text-sm shadow-md transition-all shrink-0 ${shapeClass}`}
                  >
                    <span>Schedule Now</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            )}

            {hasCatalog && (
              <a
                href={resolvedCatalogUrl}
                target={isDownloadCatalog ? "_self" : "_blank"}
                rel="noopener noreferrer"
                download={isDownloadCatalog ? "" : undefined}
                onClick={() => handleTrackClick("catalog")}
                className={`group overflow-hidden bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl transition-all flex flex-col sm:flex-row ${shapeClass}`}
              >
                {profile.catalog_cover_url ? (
                  <div className="sm:w-48 md:w-56 h-44 sm:h-auto relative overflow-hidden bg-slate-900 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.catalog_cover_url}
                      alt={profile.catalog_title || "Catalog Cover"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1 border border-slate-200 dark:border-white/15">
                      <FileText className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                      <span>PDF</span>
                    </div>
                  </div>
                ) : (
                  <div className="sm:w-36 h-28 sm:h-auto bg-gradient-to-br from-brand-500/5 via-indigo-500/5 to-accent-500/5 dark:from-brand-500/15 dark:via-indigo-500/10 dark:to-accent-500/15 flex flex-col items-center justify-center p-6 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-white/10">
                    <div
                      className={`w-12 h-12 bg-white dark:bg-brand-500/10 border border-slate-200 dark:border-transparent text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${shapeClass}`}
                    >
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mt-2">
                      Digital PDF
                    </span>
                  </div>
                )}

                <div className="p-5 md:p-6 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      Featured Document
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 break-words">
                      {profile.catalog_title || "View Product Catalog / Menu"}
                    </h3>
                    {profile.catalog_description ? (
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 break-words">
                        {profile.catalog_description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        Click to {isDownloadCatalog ? "download" : "view"} our official PDF brochure and menu.
                      </p>
                    )}
                  </div>

                  <div
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 group-hover:bg-brand-600 group-hover:text-white text-slate-800 dark:text-white font-bold text-xs transition-all shrink-0 ${shapeClass}`}
                  >
                    {isDownloadCatalog ? (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Open Catalog</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      {/* 3. GOOGLE REVIEWS SECTION (UP TO 6 BUSINESSES) */}
      {hasReviews && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Google Reviews
            </h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {googleReviews.map((review) => (
              <a
                key={review.id}
                href={review.review_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between gap-4 ${shapeClass}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Rate Us on Google
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                    {review.business_name}
                  </h3>

                  {review.address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {review.address}
                    </p>
                  )}
                </div>

                <div
                  className={`w-full py-2.5 px-4 bg-amber-500/10 group-hover:bg-amber-500 text-amber-700 dark:text-amber-300 group-hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${shapeClass}`}
                >
                  <span>Write a Review</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 4. INTERACTIVE STORE LOCATION MAP */}
      {hasMap && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Location & Map
            </h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div
            className={`overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 shadow-sm ${shapeClass}`}
          >
            <iframe
              src={mapSrc!}
              width="100%"
              height="280"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Store Location Map"
              className="w-full h-[280px]"
            />
            {profile.location_address && (
              <div className="p-4 bg-white dark:bg-dark-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 overflow-hidden">
                  <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="truncate">{profile.location_address}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    profile.location_address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                >
                  <span>Directions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}