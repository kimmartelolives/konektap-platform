"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from "lucide-react";

export function PortfolioGallery({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Featured Portfolio</h2>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map(item => (
          <PortfolioCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function PortfolioCard({ item }: { item: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = item.image_urls || [];
  const hasImages = images.length > 0;
  const hasMultiple = images.length > 1;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group rounded-[1.5rem] bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/50 transition-all overflow-hidden flex flex-col">
      {/* Image Slider */}
      <div className="relative w-full h-48 sm:h-56 bg-slate-100 dark:bg-dark-950 overflow-hidden">
        {hasImages ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={images[currentIndex]} 
              alt={item.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            
            {hasMultiple && (
              <>
                <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={prevImage} className="p-2 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextImage} className="p-2 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Dots Indicator */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {images.map((_: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "bg-white w-3" : "bg-white/50 w-1.5"}`} 
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-slate-500 mt-2 line-clamp-3">{item.description}</p>
        )}
        
        <div className="mt-auto pt-4">
          {item.link_url && (
            <a 
              href={item.link_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              View Project <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}