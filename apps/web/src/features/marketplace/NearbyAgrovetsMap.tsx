"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="skeleton h-[420px] w-full rounded-2xl" />,
});

/** Leaflet map (client-only) showing the farmer and the nearest agrovets. */
export function NearbyAgrovetsMap() {
  return <MapInner />;
}
