"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { Card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { initials } from "@/features/profile/format";
import { COUNTIES } from "@/features/profile/kenya";
import { ProfileHeader } from "@/features/profile/ProfileHeader";
import { usePhoto } from "@/features/profile/usePhoto";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BuyerProfile, MeResponse } from "@/lib/types";

export default function BuyerProfilePage() {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const profile = (user?.profile || {}) as BuyerProfile;
  const photo = usePhoto({ field: "photo", current: profile.photo });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const name =
    profile.first_name ||
    [user?.user.first_name, user?.user.last_name].filter(Boolean).join(" ") ||
    user?.user.username ||
    "Buyer";
  const place = [profile.county, profile.country || "Kenya"].filter(Boolean).join(", ");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
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
      toast.success("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Your changes could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalShell role="buyer" title="Buyer profile">
      <div className="profile-page">
        <ProfileHeader
          eyebrow="Buyer profile"
          name={name}
          badge={profile.verified !== false ? profile.verification_badge || "Verified" : undefined}
          meta={profile.phone_number || profile.email || user?.user.email || undefined}
          place={place || "Add your county so farmers know where you buy"}
          initials={initials(name, "", user?.user.username)}
          photoUrl={photo.url}
          photoBusy={photo.busy}
          onPhoto={photo.upload}
          actions={
            photo.url ? (
              <button type="button" className="btn btn-ghost" disabled={photo.busy} onClick={photo.remove}>
                Remove photo
              </button>
            ) : null
          }
        />

        <form onSubmit={onSubmit} className="max-w-3xl">
          <Card title="Contact details">
            <p className="mb-3 text-sm text-ink/70">Farmers see these on the market page, so they can recognise and reach you.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Display name" name="first_name" required defaultValue={profile.first_name || user?.user.first_name || ""} />
              <FormField label="Email" name="email" type="email" required defaultValue={profile.email || user?.user.email || ""} />
              <FormField label="Phone" name="phone_number" type="tel" inputMode="tel" required defaultValue={profile.phone_number || ""} />
              <FormField label="County" name="county" list="buyer-counties" required defaultValue={profile.county || ""} />
              <FormField label="Country" name="country" required defaultValue={profile.country || "Kenya"} />
            </div>
            <datalist id="buyer-counties">
              {COUNTIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {error ? (
              <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-4">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </Card>
        </form>
      </div>
    </PortalShell>
  );
}
