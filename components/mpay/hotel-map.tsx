"use client";

import { useEffect, useRef } from "react";
import type { HotelResult } from "@/lib/hotels/types";

// Carte Leaflet + tuiles OpenStreetMap (aucune clé API requise). Leaflet est
// chargé dynamiquement côté client uniquement (il touche `window`), et sa
// feuille de style est injectée via un <link> pour éviter les soucis de
// bundling CSS. On dessine des marqueurs personnalisés (divIcon) plutôt que
// les icônes par défaut de Leaflet, qui cassent avec les bundlers.

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

interface HotelMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  hotels: HotelResult[];
  activeId?: string | null;
  onSelectHotel?: (id: string) => void;
  onPickLocation?: (coords: { lat: number; lng: number }) => void;
}

export function HotelMap({ center, radiusKm, hotels, activeId, onSelectHotel, onPickLocation }: HotelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const layersRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const onPickRef = useRef(onPickLocation);
  onPickRef.current = onPickLocation;

  // Initialisation unique de la carte
  useEffect(() => {
    let cancelled = false;
    ensureLeafletCss();
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(
        [center.lat, center.lng],
        13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      layersRef.current = L.layerGroup().addTo(map);
      map.on("click", (event: any) => {
        onPickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      mapRef.current = map;
      // Force le recalcul de taille (le conteneur peut être monté avant layout)
      setTimeout(() => map.invalidateSize(), 100);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentre la carte + met à jour le marqueur utilisateur et le cercle de rayon
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    map.setView([center.lat, center.lng]);

    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: "",
        html: `<span style="display:flex;width:18px;height:18px;border-radius:9999px;background:#d946ef;border:3px solid #fff;box-shadow:0 0 0 3px rgba(217,70,239,.35)"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(map);

    if (circleRef.current) circleRef.current.remove();
    circleRef.current = L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000,
      color: "#d946ef",
      weight: 1,
      fillColor: "#d946ef",
      fillOpacity: 0.08,
    }).addTo(map);
  }, [center.lat, center.lng, radiusKm]);

  // Redessine les marqueurs d'hôtels à chaque changement de résultats/sélection
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!L || !map || !layers) return;
    layers.clearLayers();

    hotels.forEach((hotel) => {
      if (hotel.latitude === undefined || hotel.longitude === undefined) return;
      const active = hotel.id === activeId;
      const price = `${hotel.price.currency} ${Math.round(hotel.price.amount)}`;
      const marker = L.marker([hotel.latitude, hotel.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<span style="display:inline-flex;align-items:center;white-space:nowrap;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:800;color:${active ? "#0f172a" : "#fff"};background:${active ? "#f0abfc" : "#a21caf"};border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.35)">${price}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 12],
        }),
        zIndexOffset: active ? 1000 : 0,
      });
      marker.on("click", () => onSelectHotel?.(hotel.id));
      marker.addTo(layers);
    });
  }, [hotels, activeId, onSelectHotel]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Carte des hôtels à proximité" role="application" />;
}
