"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2 } from "lucide-react";

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Default fallback center (e.g., Cavite / Philippines area)
  const defaultLat = latitude || 14.2938;
  const defaultLng = longitude || 120.8633;

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView(
        [latitude || defaultLat, longitude || defaultLng],
        latitude && longitude ? 16 : 13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;

      // Initial Marker if coordinates exist
      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        marker.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          onLocationSelect(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      // Click event to drop/move pin
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on("dragend", (ev) => {
            const pos = ev.target.getLatLng();
            onLocationSelect(pos.lat, pos.lng);
          });
          markerRef.current = marker;
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Address Search using OpenStreetMap Nominatim API
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        const map = mapInstanceRef.current;
        map.setView([lat, lon], 16);
        onLocationSelect(lat, lon);

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
        } else {
          const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
          marker.on("dragend", (ev) => {
            const pos = ev.target.getLatLng();
            onLocationSelect(pos.lat, pos.lng);
          });
          markerRef.current = marker;
        }
      } else {
        alert("Location not found. Please try a more specific address or landmark.");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search Bar inside Map Picker */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or landmark (e.g. Imus Cavite)"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-brand-600 transition flex items-center gap-1.5 shrink-0"
        >
          {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Search</span>
        </button>
      </div>

      {/* Leaflet Map Box */}
      <div
        ref={mapRef}
        className="w-full h-[320px] rounded-2xl border border-slate-200 dark:border-white/10 z-10 shadow-inner"
      />
      <p className="text-[11px] text-slate-400 text-center">
        💡 <strong>Type an address and click Search</strong> to jump to that location, or click anywhere on the map to drop your exact pin.
      </p>
    </div>
  );
}