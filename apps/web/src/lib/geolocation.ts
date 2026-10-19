"use client";

import { useCallback, useState } from "react";

export type GeoPosition = { lat: number; lon: number };

/**
 * Browser geolocation. `locate()` resolves to the position (or null on error)
 * and records the error message for the UI.
 */
export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<GeoPosition | null>(null);

  const locate = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setError("Geolocation is not supported on this device.");
        resolve(null);
        return;
      }
      setLoading(true);
      setError("");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setPosition(p);
          setLoading(false);
          resolve(p);
        },
        (err) => {
          setError(
            err.code === 1
              ? "Location permission denied. Allow location access to continue."
              : "Could not get your location."
          );
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  }, []);

  return { loading, error, position, locate };
}
