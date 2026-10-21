"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shrinkImage } from "@/lib/image";
import type { MeResponse } from "@/lib/types";

/**
 * Upload / remove the signed-in user's profile photo.
 * `field` is the API's file field: "profile_photo" for farmers, "photo" for buyers.
 */
export function usePhoto({ field, current }: { field: "profile_photo" | "photo"; current: string | null | undefined }) {
  const { refreshMe } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const setPreviewUrl = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  async function upload(chosen: File) {
    setBusy(true);
    try {
      const file = await shrinkImage(chosen);
      setPreviewUrl(URL.createObjectURL(file));
      const fd = new FormData();
      fd.append(field, file);
      await apiRequest<MeResponse>("/api/v1/me/", { method: "PATCH", formData: fd });
      await refreshMe();
      toast.success("Photo updated");
    } catch (err) {
      setPreviewUrl(null);
      toast.error(err instanceof ApiError ? err.message : "The photo could not be uploaded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await apiRequest<MeResponse>("/api/v1/me/", { method: "PATCH", body: { clear_profile_photo: true } });
      setPreviewUrl(null);
      await refreshMe();
      toast.success("Photo removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "The photo could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return { url: preview ?? current ?? null, busy, upload, remove };
}
