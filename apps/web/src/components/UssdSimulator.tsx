"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckIcon, CloseIcon, PhoneIcon } from "@/components/Icons";
import { Reveal } from "@/components/Reveal";
import { PHOTOS } from "@/lib/photos";

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

const CAN_DO = [
  "Check your wallet balance",
  "Ask for farming advice",
  "Check market prices and input shops",
  "See your Farm Health Score and manage who can view it",
];

function newSessionId() {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The phone (USSD) section of the home page: explainer, photo and a working practice phone. */
export function UssdSimulator() {
  const inputId = useId();
  const [meta, setMeta] = useState<SimMeta | null>(null);
  const [phone, setPhone] = useState("254700000000");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [screen, setScreen] = useState("Dial *384*55# to open Ukulima Bora USSD.");
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
          excluded_reason: "Scanning needs a camera — use the Ukulima Bora app.",
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

  const code = meta?.service_code || "*384*55#";

  return (
    <section id="ussd-demo" className="mk-section ussd-section">
      <div className="mk-container">
        <Reveal variant="zoom">
          <div className="ussd-card">
            <div className="ussd-copy">
              <span className="hp-label">No smartphone? No problem</span>
              <h2 className="section-title">Use Ukulima Bora from any phone</h2>
              <p className="section-lead section-lead--left">
                Dial a short code to check your wallet, ask for advice, find
                prices, and more — even on a basic handset.
              </p>

              <div className="ussd-code">
                <span className="ussd-code__icon" aria-hidden>
                  <PhoneIcon size={22} />
                </span>
                <span>
                  <span className="ussd-code__label">Dial from any handset</span>
                  <span className="ussd-code__num">{code}</span>
                </span>
              </div>

              <ul className="ussd-points">
                {CAN_DO.map((text) => (
                  <li key={text}>
                    <span className="ussd-points__icon is-yes" aria-hidden>
                      <CheckIcon size={14} />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
                <li className="is-no">
                  <span className="ussd-points__icon is-no" aria-hidden>
                    <CloseIcon size={14} />
                  </span>
                  <span>
                    Crop photos need a camera — use the Ukulima Bora app to scan a
                    leaf
                  </span>
                </li>
              </ul>
            </div>

            <div className="ussd-stage">
              <div className="ussd-phone animate-drift w-full max-w-[320px]">
                <div className="ussd-bezel">
                  <div className="ussd-earpiece" aria-hidden />
                  <div className="ussd-screen">
                    <div className="ussd-status">
                      <span>Ukulima Bora</span>
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
                      className={`btn btn-primary ussd-dial ${
                        ended && !pending ? "is-idle" : ""
                      }`}
                      onClick={dialFresh}
                      disabled={pending}
                    >
                      Dial {code}
                    </button>
                    <button
                      type="button"
                      className="btn ussd-send"
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
            </div>

            <div className="ussd-photo">
              <Image
                src={PHOTOS.textingFarm.src}
                alt={PHOTOS.textingFarm.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
