"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useModuleActions } from "./hooks";
import { pricingLabel } from "./registry";
import { MODULES_API_ENABLED } from "./repository";
import type { CatalogModule } from "./types";

/** Install / Open / Remove for one module, with a payment confirmation for paid apps. */
export function InstallButton({
  module,
  showOpen = true,
  size = "md",
}: {
  module: CatalogModule;
  showOpen?: boolean;
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const { install, uninstall } = useModuleActions();
  const [confirm, setConfirm] = useState<"install" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [lowBalance, setLowBalance] = useState(false);
  const paid = module.settings.model !== "free" && module.settings.price > 0;
  const price = pricingLabel(module.settings.model, module.settings.price);
  const small = size === "sm" ? "!py-1.5 text-xs" : "";
  // Farmers top up from their profile; other roles have no top-up screen yet.
  const topUpPath = user?.role === "farmer" ? "/farmer/profile" : null;
  const payFrom = user?.role === "farmer" ? "your wallet" : "your Ukulima Bora account balance";

  async function run(action: "install" | "remove") {
    setError("");
    setLowBalance(false);
    try {
      if (action === "install") await install.mutateAsync(module.key);
      else await uninstall.mutateAsync(module.key);
      setConfirm(null);
    } catch (err) {
      const short = err instanceof ApiError && err.status === 402;
      setLowBalance(short);
      setError(
        short
          ? topUpPath
            ? "Not enough money in your wallet. Top up and try again."
            : "Your account balance is too low for this app. Contact Ukulima Bora support to top up."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again."
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {module.installed ? (
        <>
          {showOpen ? (
            <Link href={module.nav[0].href} className={`btn btn-primary ${small}`}>
              Open
            </Link>
          ) : null}
          <button type="button" className={`btn btn-ghost ${small}`} onClick={() => setConfirm("remove")}>
            Remove
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`btn btn-primary ${small}`}
          disabled={install.isPending}
          onClick={() => (paid ? setConfirm("install") : run("install"))}
        >
          {install.isPending ? "Installing…" : paid ? `Get · ${price}` : "Install"}
        </button>
      )}
      {error ? (
        <p className="w-full text-xs text-[var(--danger)]">
          {error}{" "}
          {lowBalance && topUpPath ? (
            <Link href={topUpPath} className="font-semibold underline">
              Top up
            </Link>
          ) : null}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirm === "install"}
        title={`Get ${module.name}?`}
        confirmLabel={`Pay ${price}`}
        busy={install.isPending}
        onConfirm={() => run("install")}
        onCancel={() => setConfirm(null)}
      >
        <p>
          {module.settings.model === "monthly"
            ? `${price} is taken from ${payFrom} now and every month while the app is installed. Remove it any time to stop paying.`
            : `${price} is taken from ${payFrom} once. You keep the app after that.`}
        </p>
        {!MODULES_API_ENABLED ? (
          <p className="mt-2 text-xs text-[var(--muted)]">Preview: no money moves until the payments backend is connected.</p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "remove"}
        title={`Remove ${module.name}?`}
        confirmLabel="Remove"
        tone="danger"
        busy={uninstall.isPending}
        onConfirm={() => run("remove")}
        onCancel={() => setConfirm(null)}
      >
        <p>
          It disappears from your menu. Your saved data stays, so you can install it again later without losing
          anything.
          {module.settings.model === "monthly" ? " Monthly payments stop." : ""}
        </p>
      </ConfirmDialog>
    </div>
  );
}
