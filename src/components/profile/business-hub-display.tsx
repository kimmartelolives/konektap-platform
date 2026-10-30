"use client";

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
              <div
                key={service.id}
                className={`p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/40 transition-all flex flex-col justify-between gap-2 overflow-hidden ${shapeClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base line-clamp-2 break-words flex-1 min-w-0">
                    {service.title}
                  </h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    {formatPriceDisplay(service.price)}
                  </span>
                </div>
                {service.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 break-words">
                    {service.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
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