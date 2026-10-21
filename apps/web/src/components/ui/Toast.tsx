"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon, CloseIcon, InfoIcon } from "@/components/Icons";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; tone: Tone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** How long a message stays: errors linger so they can be read and acted on. */
const LIFETIME_MS: Record<Tone, number> = { success: 3800, info: 4500, error: 7000 };
const MAX_VISIBLE = 3;

/**
 * Small confirmation messages ("Sale saved", "App installed") that appear after an action and
 * fade away. Mounted once in Providers; call `useToast()` from any client component.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const arm = useCallback(
    (id: number, tone: Tone) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS[tone]));
    },
    [dismiss]
  );

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setItems((list) => {
        // The same message twice in a row is one message, not a stack.
        if (list.some((t) => t.tone === tone && t.message === message)) return list;
        return [...list, { id, tone, message }].slice(-MAX_VISIBLE);
      });
      arm(id, tone);
    },
    [arm]
  );

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((t) => window.clearTimeout(t));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  const pause = (item: ToastItem) => {
    const timer = timers.current.get(item.id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(item.id);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.tone}`}
            role={t.tone === "error" ? "alert" : "status"}
            onMouseEnter={() => pause(t)}
            onMouseLeave={() => arm(t.id, t.tone)}
            onFocus={() => pause(t)}
            onBlur={() => arm(t.id, t.tone)}
          >
            <span className="toast__icon" aria-hidden>
              {t.tone === "success" ? <CheckIcon size={16} /> : <InfoIcon size={16} />}
            </span>
            <p className="toast__text">{t.message}</p>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss message">
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
