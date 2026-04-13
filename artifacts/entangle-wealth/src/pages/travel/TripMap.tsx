import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PersonalActivity, TripStop } from "./types";
import { MARKER_COLORS } from "./types";

interface Props {
  activities: PersonalActivity[];
  destinations: string[];
  highlightDay: number | null;
  onMapReady?: () => void;
}

const ICON_SVG = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
  <circle cx="14" cy="14" r="6" fill="rgba(0,0,0,0.25)"/>
  <circle cx="14" cy="14" r="4" fill="white"/>
</svg>`;

function createIcon(color: string) {
  return L.divIcon({
    html: ICON_SVG(color),
    className: "custom-marker",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Geocoding failed silently
  }
  return null;
}

export default function TripMap({ activities, destinations, highlightDay }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.LayerGroup | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const geocodeCache = useRef<Record<string, { lat: number; lng: number }>>({});

  const geocodeCached = useCallback(async (place: string) => {
    if (geocodeCache.current[place]) return geocodeCache.current[place];
    const result = await geocode(place);
    if (result) {
      geocodeCache.current[place] = result;
    }
    return result;
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(mapInstance.current);

    markersRef.current = L.layerGroup().addTo(mapInstance.current);
    linesRef.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    async function resolveStops() {
      setLoading(true);
      const newStops: TripStop[] = [];

      for (const dest of destinations) {
        const coords = await geocodeCached(dest);
        if (coords) {
          newStops.push({ name: dest, ...coords, type: "activity", day: 0 });
        }
      }

      for (const act of activities) {
        if (act.location.trim()) {
          const coords = await geocodeCached(act.location);
          if (coords) {
            newStops.push({ name: `${act.title} (${act.location})`, ...coords, type: act.type, day: act.day });
          }
        }
      }

      setStops(newStops);
      setLoading(false);
    }
    resolveStops();
  }, [destinations, activities, geocodeCached]);

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || !linesRef.current) return;

    markersRef.current.clearLayers();
    linesRef.current.clearLayers();

    const visibleStops = highlightDay !== null
      ? stops.filter(s => s.day === highlightDay || s.day === 0)
      : stops;

    const bounds: [number, number][] = [];

    visibleStops.forEach(stop => {
      const color = MARKER_COLORS[stop.type] || "#FF8C00";
      const opacity = highlightDay !== null && stop.day !== highlightDay && stop.day !== 0 ? 0.4 : 1;
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createIcon(color),
        opacity,
      });
      const popupContent = document.createElement("div");
      popupContent.style.cssText = "font-family: sans-serif; font-size: 13px; color: #333;";
      const nameEl = document.createElement("strong");
      nameEl.textContent = stop.name;
      const br = document.createElement("br");
      const detailEl = document.createElement("span");
      detailEl.style.cssText = "color: #666; font-size: 11px;";
      detailEl.textContent = `${stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}${stop.day > 0 ? ` · Day ${stop.day}` : ""}`;
      popupContent.appendChild(nameEl);
      popupContent.appendChild(br);
      popupContent.appendChild(detailEl);
      marker.bindPopup(popupContent);
      markersRef.current!.addLayer(marker);
      bounds.push([stop.lat, stop.lng]);
    });

    if (highlightDay !== null) {
      const dayStops = stops.filter(s => s.day === highlightDay).sort((a, b) => a.day - b.day);
      if (dayStops.length > 1) {
        const coords: [number, number][] = dayStops.map(s => [s.lat, s.lng]);
        L.polyline(coords, { color: MARKER_COLORS.activity, weight: 2, opacity: 0.6, dashArray: "8, 4" })
          .addTo(linesRef.current!);
      }
    } else {
      const destStops = stops.filter(s => s.day === 0);
      if (destStops.length > 1) {
        const coords: [number, number][] = destStops.map(s => [s.lat, s.lng]);
        L.polyline(coords, { color: "#FF8C00", weight: 2, opacity: 0.4, dashArray: "8, 4" })
          .addTo(linesRef.current!);
      }
    }

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [stops, highlightDay]);

  return (
    <div className="relative rounded-sm overflow-hidden border border-[rgba(255,140,0,0.15)]">
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center">
          <div className="text-[13px] text-primary animate-pulse">Loading map data...</div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-[400px] md:h-[500px]" />
      <style>{`
        .custom-marker { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px; }
      `}</style>
      <div className="absolute bottom-3 left-3 z-[1000] flex gap-2 flex-wrap">
        {Object.entries(MARKER_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-white/70 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
