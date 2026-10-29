"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Image as ImageIcon, Trash2, Edit2, Save, X, ExternalLink, Loader2 } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { savePortfolioItem, deletePortfolioItem, deletePortfolioImage } from "@/app/dashboard/portfolio/actions";

export function PortfolioManager({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<any | null>(null);
  
  // State para sa mga images na i-uupload at images na nakasave na
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAddNew() {
    setCurrentItem({ title: "", description: "", link_url: "", image_urls: [], position: items.length });
    setExistingImages([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setIsEditing(true);
  }

  function handleEdit(item: any) {
    setCurrentItem(item);
    setExistingImages(item.image_urls || []);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setCurrentItem(null);
  }

  // Kapag nag-select ng isa o higit pang bagong picture
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setNewImagePreviews(prev => [...prev, ...newPreviews]);
    }
  }

  // Burahin ang isang bagong select na picture bago i-save
  function handleRemoveNewPreview(index: number) {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // Burahin ang existing picture (tatanggalin sa view at itatago ang delete action sa server action mamaya)
  async function handleRemoveExisting(urlToRemove: string) {
    if(!confirm("Remove this image?")) return;
    startTransition(async () => {
      // Burahin diretso sa storage
      await deletePortfolioImage(urlToRemove);
      // I-update ang state
      setExistingImages(prev => prev.filter(url => url !== urlToRemove));
    });
  }

  async function handleDelete(id: string, imageUrls: string[]) {
    if (!confirm("Are you sure you want to delete this item? All its images will be removed.")) return;
    
    startTransition(async () => {
      await deletePortfolioItem(id, imageUrls);
      setItems(items.filter(item => item.id !== id));
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    formData.delete("images"); // Linisin ang default file input value

    // I-compress ang bawat bagong file bago i-append sa FormData
    if (newImageFiles.length > 0) {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true };
      
      for (const file of newImageFiles) {
        try {
          const compressedFile = await imageCompression(file, options);
          formData.append("images", compressedFile, compressedFile.name);
        } catch (error) {
          console.error("Compression failed for a file:", error);
          alert("Failed to compress one of the images.");
          return;
        }
      }
    }

    startTransition(async () => {
      const result = await savePortfolioItem(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* HEADER & ADD BUTTON */}
      <div className="flex items-center justify-between glass-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900">
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Featured Portfolio</h2>
          <p className="text-sm text-slate-500">Showcase your best projects with multiple images per post.</p>
        </div>
        {!isEditing && (
          <button onClick={handleAddNew} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* FORM: ADD / EDIT ITEM */}
      {isEditing && currentItem && (
        <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 rounded-3xl shadow-xl border border-brand-500/30 bg-slate-50 dark:bg-dark-900 space-y-6 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">{currentItem.id ? "Edit Item" : "Add New Item"}</h3>
            <button type="button" onClick={handleCancel} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input type="hidden" name="id" value={currentItem.id || ""} />
          {/* I-papasa ang natirang lumang images as JSON string */}
          <input type="hidden" name="existing_image_urls" value={JSON.stringify(existingImages)} />
          <input type="hidden" name="position" value={currentItem.position} />

          <div className="flex flex-col gap-6">
            
            {/* MULTI-IMAGE GALLERY UPLOADER */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project Images (Up to 10)</label>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Image
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {/* Existing Images */}
                {existingImages.map((url, idx) => (
                  <div key={`exist-${idx}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Saved" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => handleRemoveExisting(url)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* New Images Preview */}
                {newImagePreviews.map((preview, idx) => (
                  <div key={`new-${idx}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="New" className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">NEW</div>
                    <button type="button" onClick={() => handleRemoveNewPreview(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button Box */}
                {(existingImages.length + newImagePreviews.length) === 0 && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-100 dark:bg-dark-950 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">Upload</span>
                  </div>
                )}
              </div>

              {/* Allow Multiple Uploads */}
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Item Details */}
            <div className="w-full space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input name="title" defaultValue={currentItem.title} required placeholder="e.g. Custom 3D Printed Stand" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm outline-none" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea name="description" defaultValue={currentItem.description} rows={3} placeholder="Detailed project description..." className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm outline-none resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action Link (Optional)</label>
                <input name="link_url" defaultValue={currentItem.link_url} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm outline-none" />
              </div>

              <button type="submit" disabled={isPending} className="w-full md:w-auto px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isPending ? "Saving..." : "Save Portfolio Item"}
              </button>
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
              <p className="text-slate-500 font-medium">No portfolio items yet.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900 flex flex-col gap-4">
                
                {/* Image Cover/Gallery Indicator */}
                <div className="w-full h-40 shrink-0 rounded-2xl bg-slate-100 dark:bg-dark-950 overflow-hidden border border-slate-200 dark:border-white/10 relative">
                  {item.image_urls && item.image_urls.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                      {item.image_urls.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                          +{item.image_urls.length - 1} Photos
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8" /></div>
                  )}
                </div>
                
                {/* Info & Actions */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">{item.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button onClick={() => handleEdit(item)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.image_urls || [])} disabled={isPending} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {item.link_url && (
                      <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors">
                        Visit Link <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}