"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type Options = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
};

type Pending = { options: Options; resolve: (answer: boolean) => void };

const ConfirmContext = createContext<((options: Options) => Promise<boolean>) | null>(null);

/**
 * Styled replacement for `window.confirm`. Mounted once in Providers:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Remove product?", tone: "danger", confirmLabel: "Remove" })) { … }
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: Options) =>
      new Promise<boolean>((resolve) => {
        // A second question while one is open counts as "no" to the first.
        setPending((current) => {
          current?.resolve(false);
          return { options, resolve };
        });
      }),
    []
  );

  const answer = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.options.title ?? ""}
        confirmLabel={pending?.options.confirmLabel ?? "Confirm"}
        cancelLabel={pending?.options.cancelLabel}
        tone={pending?.options.tone}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      >
        {pending?.options.message ? <p>{pending.options.message}</p> : null}
      </ConfirmDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
