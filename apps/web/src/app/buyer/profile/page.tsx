"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BuyerProfile, MeResponse } from "@/lib/types";

export default function BuyerProfilePage() {
  const { user, refreshMe } = useAuth();
  const profile = (user?.profile || {}) as BuyerProfile;
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const displayName =
    profile.first_name ||
    [user?.user.first_name, user?.user.last_name].filter(Boolean).join(" ") ||
    user?.user.username ||
    "Buyer";

  const photoUrl = photoPreview || profile.photo || null;

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        body: {
          first_name: String(fd.get("first_name") || ""),
          email: String(fd.get("email") || ""),
          phone_number: String(fd.get("phone_number") || ""),
          county: String(fd.get("county") || ""),
          country: String(fd.get("country") || "Kenya"),
        },
      });
      await refreshMe();
      setSaveMsg("Profile updated.");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Could not save profile"
      );
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setPhotoBusy(true);
    setSaveError("");
    setSaveMsg("");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("photo", file);
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        formData: fd,
      });
      await refreshMe();
      setSaveMsg("Photo updated.");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Could not upload photo"
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <PortalShell role="buyer" title="Buyer profile">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="brand-mark text-3xl text-leaf-deep">Your profile</h1>
          <p className="mt-1 text-sm text-ink/60">
            Keep your details current so farmers can recognise and reach you on
            the market page.
          </p>
        </div>

        <section className="panel rounded-2xl p-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="h-28 w-28 overflow-hidden rounded-2xl bg-leaf-deep/10">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-ink/40">
                  No photo
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-leaf-deep">
                  {displayName}
                </h2>
                <span className="rounded-md bg-[var(--sprout)]/80 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-leaf-deep">
                  {profile.verification_badge || "Verified"}
                </span>
              </div>
              <input
                id={fileInputId}
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  onPhotoSelected(e.target.files?.[0] || null)
                }
              />
              <button
                type="button"
                disabled={photoBusy}
                className="rounded-xl bg-leaf-deep px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => fileRef.current?.click()}
              >
                {photoBusy ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>
        </section>

        <form onSubmit={saveProfile} className="panel space-y-4 rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Display name"
              name="first_name"
              required
              defaultValue={profile.first_name || user?.user.first_name || ""}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              required
              defaultValue={profile.email || user?.user.email || ""}
            />
            <FormField
              label="Phone"
              name="phone_number"
              required
              defaultValue={profile.phone_number || ""}
            />
            <FormField
              label="County"
              name="county"
              required
              defaultValue={profile.county || ""}
            />
            <FormField
              label="Country"
              name="country"
              required
              defaultValue={profile.country || "Kenya"}
            />
          </div>

          {saveError ? (
            <p className="text-sm text-[var(--danger)]">{saveError}</p>
          ) : null}
          {saveMsg ? <p className="text-sm text-leaf-deep">{saveMsg}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-leaf-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </PortalShell>
  );
}
