"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AGRIBOT_OPEN_EVENT } from "@/lib/agribot";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type BotPayload = {
  overview?: string;
  diagnosis?: string;
  recommendations?: string[];
  prevention?: string;
  local_tip?: string;
  weather_note?: string;
};

type Turn = { role: "user" | "bot"; text?: string; data?: BotPayload };

export function AgriBotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const firstName =
    user?.user.first_name?.trim() ||
    user?.user.username ||
    "farmer";
  const county =
    typeof user?.profile?.county === "string" ? user.profile.county : "";

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy, open]);

  // Other parts of the portal (sidebar, crop advisor) open the chat with a draft question.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      setOpen(true);
      if (message) setInput(message);
    };
    window.addEventListener(AGRIBOT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(AGRIBOT_OPEN_EVENT, onOpen);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setError("");
    setTurns((t) => [...t, { role: "user", text: message }]);
    try {
      const res = await apiRequest<{ response: BotPayload }>(
        "/api/v1/chat/messages/",
        { method: "POST", body: { message } }
      );
      setTurns((t) => [...t, { role: "bot", data: res.response }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open ? (
        <div
          className="agribot-panel"
          role="dialog"
          aria-label="AgriBot chat"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div>
              <p className="font-semibold text-leaf-deep">AgriBot</p>
              <p className="text-xs text-ink/65">
                Hi {firstName}
                {county ? ` · ${county}` : ""} · Ask in English or Kiswahili
              </p>
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-sm text-ink/70 hover:bg-mist hover:text-ink"
              onClick={() => setOpen(false)}
              aria-label="Close AgriBot"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="agribot-messages">
            {turns.length === 0 ? (
              <p className="text-sm text-ink/65">
                Try: &quot;Jinsi ya kudhibiti blight kwenye nyanya?&quot; or ask
                about weather for your farm this week.
              </p>
            ) : null}
            {turns.map((turn, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  turn.role === "user"
                    ? "ml-auto bg-leaf text-white"
                    : "bg-white text-ink shadow-sm ring-1 ring-[var(--line)]"
                }`}
              >
                {turn.text}
                {turn.data ? (
                  <div className="space-y-2">
                    {turn.data.overview ? <p>{turn.data.overview}</p> : null}
                    {turn.data.diagnosis ? (
                      <p>
                        <strong>Diagnosis:</strong> {turn.data.diagnosis}
                      </p>
                    ) : null}
                    {turn.data.recommendations?.length ? (
                      <ul className="list-disc pl-4">
                        {turn.data.recommendations.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                    {turn.data.prevention ? (
                      <p>
                        <strong>Prevention:</strong> {turn.data.prevention}
                      </p>
                    ) : null}
                    {turn.data.weather_note ? (
                      <p>
                        <strong>Weather:</strong> {turn.data.weather_note}
                      </p>
                    ) : null}
                    {turn.data.local_tip ? (
                      <p className="text-leaf-deep">
                        Tip: {turn.data.local_tip}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 rounded-2xl bg-mist/80 px-3.5 py-2.5 text-sm text-leaf-deep">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-leaf/25 border-t-leaf"
                  aria-hidden
                />
                AgriBot is thinking…
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="px-4 text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-[var(--line)] p-3"
          >
            <input
              className="field !py-2.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AgriBot…"
              disabled={busy}
            />
            <button
              className="btn btn-primary shrink-0 !rounded-xl !px-4"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
              ) : (
                "Ask"
              )}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="agribot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AgriBot" : "Open AgriBot"}
        aria-expanded={open}
      >
        {open ? (
          <span className="text-lg leading-none">✕</span>
        ) : (
          <span className="flex flex-col items-center leading-none">
            <span className="text-lg" aria-hidden>
              ✦
            </span>
            <span className="mt-0.5 text-[0.65rem] font-semibold">Ask</span>
          </span>
        )}
      </button>
    </>
  );
}
