"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PencilIcon } from "@/components/Icons";
import { fetchFarmerOverview } from "@/features/farmer/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type { FarmerProfile } from "@/lib/types";
import { profileStrength, type MissingItem } from "./completeness";
import { EditProfileDialog } from "./EditProfileDialog";
import { FarmDetailsCard } from "./FarmDetailsCard";
import { acresText, cropTags, initials } from "./format";
import { HealthCard } from "./HealthCard";
import { ProfileHeader } from "./ProfileHeader";
import { StrengthCard } from "./StrengthCard";
import { usePhoto } from "./usePhoto";
import { WalletCard } from "./WalletCard";
import { WeatherCard } from "./WeatherCard";

/** The farmer's profile: who they are, their farm, weather, score and wallet. */
export function FarmerProfileView() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as FarmerProfile;
  const photo = usePhoto({ field: "profile_photo", current: profile.profile_photo });
  const overview = useQuery({ queryKey: ["farmer-overview"], queryFn: fetchFarmerOverview });
  const [dialog, setDialog] = useState<{ focus?: string } | null>(null);

  const first = user?.user.first_name;
  const last = user?.user.last_name;
  const name = [first, last].filter(Boolean).join(" ") || user?.user.username || "Farmer";
  const crops = cropTags(profile.products);
  const acres = acresText(profile.farm_size_acres);
  const place = profile.county ? [profile.county, profile.country || "Kenya"].join(", ") : "";
  const balance = overview.data?.wallet.balance ?? user?.wallet?.balance ?? "0";
  const strength = profileStrength(profile, Boolean(photo.url));

  // Missing items open the editor on their field; the photo opens the file picker instead.
  function onPick(field: MissingItem["field"]) {
    if (field === "photo") {
      document.querySelector<HTMLLabelElement>(".profile-avatar__cam")?.click();
      return;
    }
    setDialog({ focus: field });
  }

  return (
    <div className="profile-page">
      <ProfileHeader
        eyebrow="Farmer profile"
        name={name}
        meta={[`@${user?.user.username ?? ""}`, profile.farm_name].filter(Boolean).join(" · ")}
        place={place || "Add your county to unlock local weather"}
        chips={[acres ? `${acres} acres` : "", crops.length ? `${crops.length} ${crops.length === 1 ? "crop" : "crops"}` : ""].filter(Boolean)}
        initials={initials(first, last, user?.user.username)}
        photoUrl={photo.url}
        photoBusy={photo.busy}
        onPhoto={photo.upload}
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
              <PencilIcon size={15} /> Edit profile
            </button>
            {photo.url ? (
              <button type="button" className="btn btn-ghost" disabled={photo.busy} onClick={photo.remove}>
                Remove photo
              </button>
            ) : null}
          </>
        }
        stats={[
          { label: "Leaf scans", value: overview.data?.scans.total ?? "—", href: "/farmer/scan" },
          { label: "Crop advice", value: overview.data?.advisor.total ?? "—", href: "/farmer/advisor" },
          { label: "Farm health", value: profile.health_score ?? "—", hint: profile.risk_tier || undefined },
          { label: "Wallet", value: formatKsh(balance) ?? "KSh 0", href: "#wallet" },
        ]}
      />

      <StrengthCard percent={strength.percent} missing={strength.missing} onPick={onPick} />

      <div className="profile-grid">
        <div className="profile-grid__main">
          <FarmDetailsCard profile={profile} onEdit={(field) => setDialog({ focus: field })} />
          <WeatherCard county={profile.county} country={profile.country} onAddCounty={() => setDialog({ focus: "county" })} />
          <HealthCard profile={profile} />
        </div>
        <div className="profile-grid__side">
          <WalletCard phone={profile.phone_number} />
        </div>
      </div>

      {dialog ? <EditProfileDialog profile={profile} focus={dialog.focus} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
