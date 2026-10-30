"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { trackPortfolioClick } from "@/app/dashboard/portfolio/actions";

export type PortfolioItem = {
  id: string;
  title: string;
  category?: string | null;
  description: string | null;
  link_url: string | null;
  cta_label?: string | null;
  image_urls: string[] | null;
  position?: number;
};

interface PortfolioGalleryProps {
  items: PortfolioItem[];
  tier?: string | null;
}

export function PortfolioGallery({ items, tier }: PortfolioGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const isPremium = tier === "premium";

  // Extract unique categories from items
  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category?.trim())
        .filter((cat): cat is string => Boolean(cat))
    )
  );

  const filteredItems =
    selectedCategory === "All" || !isPremium
      ? items
      : items.filter((item) => item.category?.trim() === selectedCategory);

  const openLightbox = (item: PortfolioItem, startIndex = 0) => {
    setActiveItem(item);
    setActiveImageIndex(startIndex);
    if (isPremium) trackPortfolioClick(item.id);
  };

  const closeLightbox = useCallback(() => {
    setActiveItem(null);
    setActiveImageIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    if (!activeItem?.image_urls?.length) return;
    setActiveImageIndex((prev) => (prev + 1) % activeItem.image_urls!.length);
  }, [activeItem]);

  const prevImage = useCallback(() => {
    if (!activeItem?.image_urls?.length) return;
    setActiveImageIndex(
      (prev) =>
        (prev - 1 + activeItem.image_urls!.length) %
        activeItem.image_urls!.length
    );
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, closeLightbox, nextImage, prevImage]);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Featured Portfolio
        </h2>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      {/* CATEGORY FILTER PILLS (PREMIUM ONLY) */}
      {isPremium && categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {["All", ...categories].map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-brand-400"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      {/* PORTFOLIO CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {filteredItems.map((item) => {
          const images = item.image_urls || [];
          const coverImage = images[0];

          return (
            <div
              key={item.id}
              onClick={() => openLightbox(item, 0)}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl transition-all flex flex-col cursor-pointer"
            >
              {/* Cover Image */}
              <div className="w-full h-52 bg-slate-100 dark:bg-dark-950 relative overflow-hidden">
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                  <span className="text-xs font-bold text-white">
                    Click to view details
                  </span>
                </div>

                {isPremium && item.category && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-black/70 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-white/10">
                    {item.category}
                  </span>
                )}

                {images.length > 1 && (
                  <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1">
                    <Images className="w-3.5 h-3.5" />
                    <span>{images.length}</span>
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 break-words">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 break-words">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.link_url && (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPremium) trackPortfolioClick(item.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>{item.cta_label || "View Project"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE FULL-SCREEN LIGHTBOX MODAL */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-3xl bg-white dark:bg-dark-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                {isPremium && activeItem.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                    {activeItem.category}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                  {activeItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Carousel Stage */}
            {activeItem.image_urls && activeItem.image_urls.length > 0 && (
              <div className="relative bg-slate-950 flex items-center justify-center h-[320px] sm:h-[420px] select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeItem.image_urls[activeImageIndex]}
                  alt={`${activeItem.title} - Photo ${activeImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />

                {activeItem.image_urls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Thumbnail Strip */}
            {activeItem.image_urls && activeItem.image_urls.length > 1 && (
              <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-dark-950 overflow-x-auto border-b border-slate-200 dark:border-white/10">
                {activeItem.image_urls.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      idx === activeImageIndex
                        ? "border-brand-500 scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Details & CTA Footer */}
            <div className="p-6 overflow-y-auto space-y-4">
              {activeItem.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
                  {activeItem.description}
                </p>
              )}

              {activeItem.link_url && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={activeItem.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-bold text-xs shadow-md transition"
                  >
                    <span>{activeItem.cta_label || "View Project"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}