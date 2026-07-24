"use client";

import { FormEvent, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";

type BotPayload = {
  overview?: string;
  diagnosis?: string;
  recommendations?: string[];
  prevention?: string;
  local_tip?: string;
};

type Turn = { role: "user" | "bot"; text?: string; data?: BotPayload };

export default function FarmerChatPage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;
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
    <PortalShell role="farmer" title="AgriBot">
      <div className="panel flex min-h-[70vh] flex-col rounded-3xl p-4 sm:p-6">
        <div>
          <h1 className="brand-mark text-3xl text-leaf-deep">AgriBot</h1>
          <p className="text-sm text-ink/60">
            Ask in English or Kiswahili. First 5 chats free, then KSh 10.
          </p>
        </div>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/50 p-4">
          {turns.length === 0 ? (
            <p className="text-sm text-ink/45">
              Try: &quot;Jinsi ya kudhibiti blight kwenye nyanya?&quot;
            </p>
          ) : null}
          {turns.map((turn, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                turn.role === "user"
                  ? "ml-auto bg-leaf text-white"
                  : "bg-white text-ink"
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
                  {turn.data.local_tip ? (
                    <p className="text-leaf-deep">
                      Tip: {turn.data.local_tip}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            className="field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AgriBot…"
          />
          <button className="btn btn-primary shrink-0" disabled={busy} type="submit">
            Send
          </button>
        </form>
      </div>
    </PortalShell>
  );
}
