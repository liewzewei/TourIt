"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapStop = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  number: number;
};

export default function ItineraryDayMap({ stops }: { stops: MapStop[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // 2. Clear existing pins and lines when changing days
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    if (stops.length === 0) {
      map.setView([20, 0], 2);
      return;
    }

    const bounds = L.latLngBounds([]);
    const latLngs: [number, number][] = [];

    // 3. Add custom numbered markers for each stop
    stops.forEach((stop) => {
      const latLng: [number, number] = [stop.latitude, stop.longitude];
      latLngs.push(latLng);
      bounds.extend(latLng);

      // Create a prominent blue circle with the stop number inside!
      const numberedIcon = L.divIcon({
        className: "custom-number-pin",
        html: `<div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">${stop.number}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker(latLng, { icon: numberedIcon })
        .addTo(map)
        .bindPopup(`<b>#${stop.number}. ${stop.name}</b><br/><span style="font-size:12px;color:#666;">${stop.address || ""}</span>`);
    });

    // 4. Draw a dashed connecting route line between stops!
    if (latLngs.length > 1) {
      L.polyline(latLngs, { color: "#2563eb", weight: 3, dashArray: "6, 6", opacity: 0.7 }).addTo(map);
    }

    // 5. Automatically pan and zoom to fit all pins nicely
    if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], 15);
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [stops]);

  return (
    <div className="w-full h-[500px] rounded-lg border shadow-sm z-0 overflow-hidden bg-muted" ref={containerRef} />
  );
}