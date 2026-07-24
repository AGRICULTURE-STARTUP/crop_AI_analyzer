"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

type SimMeta = {
  service_code: string;
  provider: string;
  features: string[];
  excluded: string[];
  excluded_reason: string;
};

type SimReply = {
  message: string;
  end: boolean;
  response: string;
  session_id: string;
  phone_number: string;
  note?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

function newSessionId() {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function UssdSimulator() {
  const inputId = useId();
  const [meta, setMeta] = useState<SimMeta | null>(null);
  const [phone, setPhone] = useState("254700000000");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [screen, setScreen] = useState("Dial *384*55# to open AgriScan USSD.");
  const [ended, setEnded] = useState(true);
  const [textTrail, setTextTrail] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const screenRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/ussd/simulate/`)
      .then((r) => r.json())
      .then((data: SimMeta) => setMeta(data))
      .catch(() =>
        setMeta({
          service_code: "*384*55#",
          provider: "simulate",
          features: [],
          excluded: ["crop_scan"],
          excluded_reason: "Scanning needs a camera — use the AgriScan app.",
        }),
      );
  }, []);

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [screen]);

  function dialFresh() {
    const sid = newSessionId();
    setSessionId(sid);
    setTextTrail("");
    setDraft("");
    setEnded(false);
    setError(null);
    startTransition(async () => {
      await step(sid, "", phone);
    });
  }

  async function step(sid: string, text: string, phoneNumber: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/ussd/simulate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          phone_number: phoneNumber,
          text,
          service_code: meta?.service_code || "*384*55#",
        }),
      });
      if (!res.ok) {
        throw new Error(`USSD sim failed (${res.status})`);
      }
      const data = (await res.json()) as SimReply;
      setScreen(data.message);
      setEnded(data.end);
      if (data.end) {
        setTextTrail("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the phone demo right now. Please try again shortly.",
      );
      setScreen("Something went wrong. Please try dialling again.");
      setEnded(true);
    }
  }

  function sendInput(raw: string) {
    if (ended || pending) return;
    const next = textTrail ? `${textTrail}*${raw}` : raw;
    setTextTrail(next);
    setDraft("");
    startTransition(async () => {
      await step(sessionId, next, phone);
    });
  }

  function onKey(key: string) {
    if (ended) return;
    if (key === "#") {
      if (draft) sendInput(draft);
      return;
    }
    if (key === "*") {
      setDraft((d) => d + "*");
      return;
    }
    setDraft((d) => d + key);
  }

  return (
    <section
      id="ussd-demo"
      className="glass mx-auto grid max-w-6xl gap-8 rounded-3xl px-4 py-8 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-start"
    >
      <div className="animate-rise space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-headline)] sm:text-xl">
          Dial in from a basic phone
        </h3>
        <p className="max-w-lg text-sm leading-relaxed text-[var(--text-body)]">
          If you do not have a smartphone, you can still use AgriScan. Dial{" "}
          <span className="font-medium text-leaf-deep">
            {meta?.service_code || "*384*55#"}
          </span>{" "}
          to check your wallet, ask for farming advice, find buyers or input
          shops, see your Farm Health Score, and manage who can view it. Leaf
          photos need a phone with a camera — use the AgriScan app for that.
        </p>
        <ul className="space-y-2 text-sm text-[var(--text-body)]">
          <li>✓ Wallet, advice, market, inputs, score, and profile</li>
          <li>✗ Crop photos (open the AgriScan app to scan a leaf)</li>
        </ul>
      </div>

      <div className="ussd-phone animate-drift mx-auto w-full max-w-[320px]">
        <div className="ussd-bezel">
          <div className="ussd-earpiece" aria-hidden />
          <div className="ussd-screen">
            <div className="ussd-status">
              <span>AgriScan</span>
              <span>{pending ? "…" : ended ? "ready" : "connected"}</span>
            </div>
            <pre ref={screenRef} className="ussd-body">
              {screen}
            </pre>
            {!ended && (
              <div className="ussd-compose">
                <span className="opacity-60">»</span> {draft || " "}
                <span className="ussd-caret" />
              </div>
            )}
          </div>

          <label className="ussd-phone-field" htmlFor={inputId}>
            Your phone number
            <input
              id={inputId}
              className="field !rounded-lg !py-1.5 !text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!ended}
              inputMode="tel"
            />
          </label>

          <div className="ussd-pad" role="group" aria-label="USSD keypad">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="ussd-key"
                disabled={ended || pending}
                onClick={() => onKey(k)}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="ussd-actions">
            <button
              type="button"
              className="btn btn-primary !w-full !rounded-xl !text-sm"
              onClick={dialFresh}
              disabled={pending}
            >
              Dial {meta?.service_code || "*384*55#"}
            </button>
            <button
              type="button"
              className="btn btn-secondary !w-full !rounded-xl !text-sm"
              disabled={ended || pending || !draft}
              onClick={() => sendInput(draft)}
            >
              Send
            </button>
          </div>
          {error && <p className="ussd-error">{error}</p>}
          <p className="ussd-footnote">Practice demo · no airtime charged</p>
        </div>
      </div>
    </section>
  );
}
