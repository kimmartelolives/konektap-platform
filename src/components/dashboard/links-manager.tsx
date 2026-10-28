"use client";

import { useState, useTransition, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Trash2, Plus, Globe, Camera, Code, Briefcase, MessageCircle, PlaySquare, ThumbsUp } from "lucide-react";
import { addLink, deleteLink, updateLinkOrder } from "@/app/dashboard/links/actions";

type LinkItem = {
  id: string;
  title: string;
  url: string;
  platform: string;
  position: number;
};

const PLATFORMS = [
  { id: "website", name: "Website", icon: Globe },
  { id: "facebook", name: "Facebook", icon: ThumbsUp },
  { id: "instagram", name: "Instagram", icon: Camera },
  { id: "linkedin", name: "LinkedIn", icon: Briefcase },
  { id: "github", name: "GitHub", icon: Code },
  { id: "twitter", name: "X / Twitter", icon: MessageCircle },
  { id: "youtube", name: "YouTube", icon: PlaySquare },
];

export function LinksManager({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch with drag-and-drop library
  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function handleAddLink(formData: FormData) {
    formData.append("position", links.length.toString());
    
    // Optimistic UI Update (shows immediately while saving)
    const tempId = Math.random().toString();
    const newLink = {
      id: tempId,
      title: formData.get("title") as string,
      url: formData.get("url") as string,
      platform: formData.get("platform") as string,
      position: links.length,
    };
    setLinks([...links, newLink]);

    startTransition(async () => {
      await addLink(formData);
      // Let the server component re-fetch the real data
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    
    const items = Array.from(links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update position numbers
    const updatedItems = items.map((item, index) => ({ ...item, position: index }));
    setLinks(updatedItems);

    startTransition(() => {
      updateLinkOrder(updatedItems.map(item => ({ id: item.id, position: item.position })));
    });
  }

  if (!isMounted) return null;

  return (
    <div className="space-y-8">
      {/* ADD NEW LINK FORM */}
      <form action={handleAddLink} className="glass-card p-6 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-white/10">
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Add New Link</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Platform</label>
            <select name="platform" required className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none">
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</label>
            <input name="title" required placeholder="e.g. My Portfolio" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL</label>
            <input name="url" type="url" required placeholder="https://" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 focus:border-brand-500 text-sm text-slate-900 dark:text-white outline-none" />
          </div>
        </div>
        
        <button type="submit" disabled={isPending} className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </form>

      {/* DRAG AND DROP LIST */}
      <div className="space-y-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="links-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {links.length === 0 && (
                  <p className="text-sm text-center text-slate-500 py-8">No links added yet.</p>
                )}
                
                {links.map((link, index) => {
                  const Icon = PLATFORMS.find(p => p.id === link.platform)?.icon || Globe;
                  return (
                    <Draggable key={link.id} draggableId={link.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-4 p-4 bg-white dark:bg-dark-900 rounded-2xl border ${snapshot.isDragging ? 'border-brand-500 shadow-2xl scale-[1.02]' : 'border-slate-200 dark:border-white/10 shadow-sm'} transition-all`}
                        >
                          <div {...provided.dragHandleProps} className="text-slate-400 hover:text-brand-500 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-950 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{link.title}</p>
                            <p className="text-xs text-slate-500 truncate">{link.url}</p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              setLinks(links.filter(l => l.id !== link.id));
                              startTransition(() => { deleteLink(link.id); });
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
      </div>
    </div>
  );
}