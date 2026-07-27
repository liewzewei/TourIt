"use client";

import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

type LocationPickerProps = {
  /** Current coordinates (if any) — used to place the initial marker */
  coords: { lat: number; lng: number } | null;
  /** Called when user clicks the map or uses the search bar */
  onLocationSelect: (result: {
    lat: number;
    lng: number;
    address?: string;
    postalCode?: string;
  }) => void;
};

export default function LocationPicker({
  coords,
  onLocationSelect,
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [flyToQuery, setFlyToQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Keep callback ref fresh to avoid stale closures in Leaflet event handlers
  const onLocationSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Create a custom Leaflet divIcon using MapPin teardrop shape with transparent center hole
  const getMarkerIcon = () => {
    const pinHtml = renderToString(
      <div style={{ filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.35))", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
            fill="#ef4444"
            fillRule="evenodd"
          />
        </svg>
      </div>
    );
    return L.divIcon({
      className: "custom-location-pin",
      html: pinHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    if (!mapRef.current) return;

    // 1. Place or move the marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: getMarkerIcon() }).addTo(mapRef.current);
    }
    markerRef.current.bindPopup("Loading address...").openPopup();

    // 2. Reverse geocode via Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const streetPart = [addr.road || addr.pedestrian, addr.house_number]
        .filter(Boolean)
        .join(" ");
      const cityPart =
        addr.city || addr.town || addr.village || addr.suburb || "";
      const statePart = addr.state || addr.country || "";
      const displayAddress =
        [
          data.name && data.name !== streetPart ? data.name : null,
          streetPart,
          cityPart,
          statePart,
        ]
          .filter(Boolean)
          .join(", ") ||
        data.display_name ||
        "";

      markerRef.current?.setPopupContent(
        `<b>${displayAddress.split(",")[0]}</b><br/><span style="font-size:12px;color:#666;">${displayAddress}</span>`
      );

      onLocationSelectRef.current({
        lat,
        lng,
        address: displayAddress,
        postalCode: addr.postcode,
      });
    } catch {
      markerRef.current?.setPopupContent("Could not resolve address");
      onLocationSelectRef.current({ lat, lng });
    }
  };

  const handleFlyToSearch = async () => {
    if (!flyToQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          flyToQuery
        )}&addressdetails=1&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const match = data[0];
        const lat = parseFloat(match.lat);
        const lng = parseFloat(match.lon);
        mapRef.current.flyTo([lat, lng], 16, { duration: 1.5 });

        // Also place a pin and fire the callback
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: getMarkerIcon() }).addTo(mapRef.current);
        }

        const addr = match.address || {};
        const streetPart = [addr.road || addr.pedestrian, addr.house_number]
          .filter(Boolean)
          .join(" ");
        const cityPart =
          addr.city || addr.town || addr.village || addr.suburb || "";
        const statePart = addr.state || addr.country || "";
        const displayAddress =
          [
            match.name && match.name !== streetPart ? match.name : null,
            streetPart,
            cityPart,
            statePart,
          ]
            .filter(Boolean)
            .join(", ") ||
          match.display_name ||
          "";

        markerRef.current
          .bindPopup(
            `<b>${displayAddress.split(",")[0]}</b><br/><span style="font-size:12px;color:#666;">${displayAddress}</span>`
          )
          .openPopup();

        onLocationSelectRef.current({
          lat,
          lng,
          address: displayAddress,
          postalCode: addr.postcode,
        });
      }
    } catch {
      // Silently fail — user can still drop a pin manually
    } finally {
      setIsSearching(false);
    }
  };

  // Map Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current).setView([20, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        handleMapClick(e);
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync external coords prop onto map
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      markerRef.current = L.marker([coords.lat, coords.lng], { icon: getMarkerIcon() }).addTo(
        mapRef.current
      );
    }
  }, [coords]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar — acts as "fly to" helper */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search a city, landmark, or address to jump there..."
          value={flyToQuery}
          onChange={(e) => setFlyToQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleFlyToSearch();
            }
          }}
          className="flex-grow"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleFlyToSearch}
          disabled={isSearching || !flyToQuery.trim()}
          aria-label="Search location"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-[350px] rounded-lg border shadow-sm z-0 overflow-hidden bg-muted cursor-crosshair"
      />
      <p className="text-xs text-muted-foreground">
        Click anywhere on the map to drop a pin, or search above to jump to a location.
      </p>
    </div>
  );
}
