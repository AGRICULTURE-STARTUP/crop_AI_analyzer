"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "@/lib/api";

type Agency = {
  id: number;
  agency_name: string;
  agency_type: string;
  county: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance_km: number;
};

export default function MapInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([-0.4, 37.0], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    groupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
    };
  }, []);

  function locateAndLoad() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setMessage("Geolocation is not supported on this device.");
      return;
    }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const data = await apiRequest<{ agencies: Agency[] }>(
            `/api/v1/inputs/agencies/nearest/?lat=${lat}&lon=${lon}`
          );
          setAgencies(data.agencies);

          const map = mapRef.current;
          const group = groupRef.current;
          if (map && group) {
            group.clearLayers();
            L.circleMarker([lat, lon], {
              radius: 8,
              color: "#1d4ed8",
              fillColor: "#3b82f6",
              fillOpacity: 1,
            })
              .bindPopup("<strong>You are here</strong>")
              .addTo(group);

            for (const a of data.agencies) {
              L.circleMarker([a.latitude, a.longitude], {
                radius: 9,
                color: "#15803d",
                fillColor: "#22c55e",
                fillOpacity: 0.9,
              })
                .bindPopup(
                  `<strong>${a.agency_name}</strong><br/>${a.county} · ${a.distance_km} km<br/>${a.phone}`
                )
                .addTo(group);
            }

            const points: [number, number][] = [
              [lat, lon],
              ...data.agencies.map((a) => [a.latitude, a.longitude] as [number, number]),
            ];
            map.fitBounds(L.latLngBounds(points).pad(0.25));
          }
        } catch {
          setMessage("Could not load nearby agrovets.");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setMessage(
          err.code === 1
            ? "Location permission denied. Allow location to see nearby agrovets."
            : "Could not get your location."
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  return (
    <div className="nearby-map">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={locateAndLoad}
          disabled={busy}
        >
          {busy ? "Locating…" : "Find agrovets near me"}
        </button>
        {!busy && agencies.length > 0 ? (
          <span className="text-sm text-ink/70">
            {agencies.length} agrovet{agencies.length === 1 ? "" : "s"} nearby
          </span>
        ) : null}
      </div>
      {message ? <p className="mb-2 text-sm text-ink/70">{message}</p> : null}
      <div ref={containerRef} className="z-0 w-full rounded-2xl" style={{ height: 420 }} />
    </div>
  );
}
