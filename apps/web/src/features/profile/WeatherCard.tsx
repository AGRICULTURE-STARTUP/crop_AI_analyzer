"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudIcon, InfoIcon, RefreshIcon } from "@/components/Icons";
import { weatherTip } from "@/features/farmer/weather";
import { apiRequest } from "@/lib/api";
import type { WeatherResponse } from "@/lib/types";

const metric = (value: number | string | undefined | null, digits = 0) => {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : n.toFixed(digits);
};

/** Today's weather for the farmer's county, with one line of practical advice. */
export function WeatherCard({ county, country, onAddCounty }: { county?: string | null; country?: string | null; onAddCounty: () => void }) {
  const query = useQuery({
    queryKey: ["weather", county],
    queryFn: () => apiRequest<WeatherResponse>("/api/v1/weather/"),
    enabled: Boolean(county),
    staleTime: 10 * 60 * 1000,
  });
  const weather = query.data?.weather ?? null;
  const place = county ? [county, country].filter(Boolean).join(", ") : "County not set";
  const tip = weatherTip(weather);

  return (
    <section className="weather-card">
      <div className="weather-card__head">
        <div>
          <h2>Local weather</h2>
          <p>{(weather?.location || place).replace(/,\s*/g, ", ")}</p>
        </div>
        {county ? (
          <button
            type="button"
            className="weather-card__refresh"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh the weather"
            title="Refresh"
          >
            <RefreshIcon size={15} className={query.isFetching ? "animate-spin" : ""} />
          </button>
        ) : null}
      </div>

      {!county ? (
        <div className="weather-card__empty">
          <CloudIcon size={26} />
          <p>Add your county to see the temperature, humidity, wind and rain for your farm.</p>
          <button type="button" className="btn btn-sm weather-card__btn" onClick={onAddCounty}>
            Add your county
          </button>
        </div>
      ) : query.isLoading ? (
        <div className="weather-card__skeleton" aria-busy />
      ) : weather ? (
        <>
          <div className="weather-card__main">
            <CloudIcon size={34} />
            <p className="weather-card__temp">
              {metric(weather.temperature_celsius)}
              <sup>°C</sup>
            </p>
          </div>
          <ul className="weather-card__facts">
            <li>
              <strong>{metric(weather.humidity_percent)}%</strong>
              <span>Humidity</span>
            </li>
            <li>
              <strong>{metric(weather.wind_speed_m_s, 1)} m/s</strong>
              <span>Wind</span>
            </li>
            <li>
              <strong>{metric(weather.rainfall_1h_mm ?? 0, 1)} mm</strong>
              <span>Rain, last hour</span>
            </li>
          </ul>
          {tip ? (
            <p className="weather-card__tip">
              <InfoIcon size={15} />
              {tip}
            </p>
          ) : null}
        </>
      ) : (
        <p className="weather-card__note">{query.data?.detail || "Weather could not be loaded for this location."}</p>
      )}
    </section>
  );
}
