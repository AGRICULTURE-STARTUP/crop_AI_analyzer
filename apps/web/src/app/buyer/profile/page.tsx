"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { PageHeader } from "@/components/ui/Page";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/format";
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
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          title="Your profile"
          lead="Keep your details current so farmers can recognise and reach you on the market page."
        />

        <section className="ui-card">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-mist">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xl font-semibold text-leaf-deep">
                  {initialsOf(displayName)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  {displayName}
                </h2>
                <span className="badge badge-ok">
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
                className="btn btn-secondary !py-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
              >
                {photoBusy ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>
        </section>

        <form onSubmit={saveProfile} className="ui-card space-y-4">
          <h2 className="ui-card__title">Contact details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </PortalShell>
  );
}
