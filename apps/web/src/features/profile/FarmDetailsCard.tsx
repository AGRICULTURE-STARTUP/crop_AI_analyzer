"use client";

import type { ComponentType } from "react";
import { ExpandIcon, PencilIcon, PhoneIcon, PinIcon, PlusIcon, SproutIcon } from "@/components/Icons";
import { Card } from "@/components/ui/Page";
import type { FarmerProfile } from "@/lib/types";
import { acresText, cropTags } from "./format";

type Tile = {
  label: string;
  value: string | null;
  Icon: ComponentType<{ size?: number }>;
  field: string;
  addLabel: string;
};

/** The farm at a glance. Anything not filled in yet is an "Add …" button that opens the editor on that field. */
export function FarmDetailsCard({ profile, onEdit }: { profile: FarmerProfile; onEdit: (field?: string) => void }) {
  const crops = cropTags(profile.products);
  const acres = acresText(profile.farm_size_acres);
  const location = profile.county ? [profile.county, profile.country || "Kenya"].join(", ") : null;

  const tiles: Tile[] = [
    { label: "Farm name", value: profile.farm_name?.trim() || null, Icon: SproutIcon, field: "farm_name", addLabel: "Name your farm" },
    { label: "Farm size", value: acres ? `${acres} acres` : null, Icon: ExpandIcon, field: "farm_size_acres", addLabel: "Add farm size" },
    { label: "Phone", value: profile.phone_number?.trim() || null, Icon: PhoneIcon, field: "phone_number", addLabel: "Add your phone" },
    { label: "Location", value: location, Icon: PinIcon, field: "county", addLabel: "Add your county" },
  ];

  return (
    <Card
      title="Farm details"
      action={
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit()}>
          <PencilIcon size={13} /> Edit
        </button>
      }
    >
      <ul className="detail-tiles">
        {tiles.map((t) => (
          <li key={t.label} className="detail-tile">
            <span className="detail-tile__icon" aria-hidden>
              <t.Icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="detail-tile__label">{t.label}</p>
              {t.value ? (
                <p className="detail-tile__value">{t.value}</p>
              ) : (
                <button type="button" className="detail-tile__add" onClick={() => onEdit(t.field)}>
                  <PlusIcon size={12} /> {t.addLabel}
                </button>
              )}
            </div>
          </li>
        ))}
        <li className="detail-tile detail-tile--wide">
          <span className="detail-tile__icon" aria-hidden>
            <SproutIcon size={17} />
          </span>
          <div className="min-w-0">
            <p className="detail-tile__label">Crops</p>
            {crops.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {crops.map((c) => (
                  <span key={c} className="profile-chip">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <button type="button" className="detail-tile__add" onClick={() => onEdit("products")}>
                <PlusIcon size={12} /> List your crops
              </button>
            )}
          </div>
        </li>
      </ul>
    </Card>
  );
}
