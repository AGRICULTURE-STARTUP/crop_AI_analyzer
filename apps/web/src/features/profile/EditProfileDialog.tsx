"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloseIcon } from "@/components/Icons";
import { FormField } from "@/components/FormField";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { FarmerProfile, MeResponse } from "@/lib/types";
import { acresText, cropTags } from "./format";
import { COUNTIES, CROP_SUGGESTIONS } from "./kenya";
import { TagInput } from "./TagInput";

/** Edit name, phone, farm and crops in one place. `focus` names the field to put the cursor in. */
export function EditProfileDialog({
  profile,
  focus,
  onClose,
}: {
  profile: FarmerProfile;
  focus?: string;
  onClose: () => void;
}) {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Put the cursor in the field the farmer came to fill in (default: the first name).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    // The crop box is a visible input beside a hidden one with the same name, so look for it first.
    const target =
      (focus ? form.querySelector<HTMLElement>(`[data-field="${focus}"]`) : null) ??
      (focus ? form.querySelector<HTMLElement>(`[name="${focus}"]:not([type="hidden"])`) : null) ??
      form.querySelector<HTMLElement>('[name="first_name"]');
    target?.focus();
  }, [focus]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const acres = String(fd.get("farm_size_acres") || "").trim();
    try {
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        body: {
          first_name: fd.get("first_name"),
          last_name: fd.get("last_name"),
          phone_number: fd.get("phone_number"),
          county: fd.get("county"),
          country: fd.get("country"),
          farm_name: fd.get("farm_name"),
          farm_size_acres: acres === "" ? null : acres,
          products: fd.get("products"),
        },
      });
      await refreshMe();
      toast.success("Profile updated");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Your changes could not be saved. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form
        ref={formRef}
        className="dialog dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="dialog__head">
          <h2 id="edit-profile-title" className="dialog__title">
            Edit your profile
          </h2>
          <button type="button" className="icon-btn icon-btn--sm icon-btn--neutral" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        <fieldset className="dialog__section">
          <legend>About you</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="First name" name="first_name" defaultValue={user?.user.first_name || ""} required autoComplete="given-name" />
            <FormField label="Last name" name="last_name" defaultValue={user?.user.last_name || ""} autoComplete="family-name" />
            <FormField
              label="Phone"
              name="phone_number"
              type="tel"
              inputMode="tel"
              defaultValue={profile.phone_number || ""}
              placeholder="0712 345 678"
              autoComplete="tel"
              hint="Used for M-Pesa top-ups and by buyers who contact you."
            />
          </div>
        </fieldset>

        <fieldset className="dialog__section">
          <legend>Your farm</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Farm name" name="farm_name" placeholder="e.g. Green Valley Farm" defaultValue={profile.farm_name || ""} />
            <FormField
              label="Farm size (acres)"
              name="farm_size_acres"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="e.g. 2.5"
              defaultValue={acresText(profile.farm_size_acres) ?? ""}
            />
            <FormField
              label="County"
              name="county"
              list="profile-counties"
              placeholder="e.g. Nakuru"
              defaultValue={profile.county || ""}
              required
              hint="Sets the weather and nearby sellers you see."
            />
            <FormField label="Country" name="country" defaultValue={profile.country || "Kenya"} />
          </div>
          <datalist id="profile-counties">
            {COUNTIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </fieldset>

        <fieldset className="dialog__section">
          <legend>Crops</legend>
          <TagInput
            name="products"
            label="Crops you grow"
            defaultValue={cropTags(profile.products)}
            suggestions={CROP_SUGGESTIONS}
            focusKey="products"
          />
        </fieldset>

        {error ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
