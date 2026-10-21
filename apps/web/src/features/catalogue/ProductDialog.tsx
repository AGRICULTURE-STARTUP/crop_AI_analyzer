"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CloseIcon } from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiRequest, mediaUrl } from "@/lib/api";
import type { AgencyProduct } from "@/lib/types";
import { PRODUCT_CATEGORIES } from "./categories";
import { MY_PRODUCTS_KEY } from "./hooks";

/** Add a product, or edit one (name, category, price, pack size, description, photo). */
export function ProductDialog({ product, onClose }: { product: AgencyProduct | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const editing = product !== null;
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  // Always sent: a form post that leaves the field out would be read as "not in stock".
  const [inStock, setInStock] = useState(product?.is_available ?? true);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const save = useMutation({
    mutationFn: (fd: FormData) =>
      editing
        ? apiRequest(`/api/v1/inputs/my-products/${product.id}/`, { method: "PATCH", formData: fd })
        : apiRequest("/api/v1/inputs/my-products/", { method: "POST", formData: fd }),
    onSuccess: () => {
      toast.success(editing ? "Changes saved" : "Product listed. Farmers can now find it in the marketplace.");
      qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the product. Try again."),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    // An untouched photo picker sends an empty file, which would wipe the current photo on edit.
    const photo = fd.get("image");
    if (photo instanceof File && photo.size === 0) fd.delete("image");
    fd.set("is_available", inStock ? "true" : "false");
    save.mutate(fd);
  }

  function onImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  const currentPhoto = preview ?? mediaUrl(product?.image);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form
        className="dialog dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        encType="multipart/form-data"
      >
        <div className="dialog__head">
          <h2 id="product-dialog-title" className="dialog__title">
            {editing ? "Edit product" : "Add a product"}
          </h2>
          <button type="button" className="icon-btn icon-btn--sm icon-btn--neutral" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="dialog__fields">
          <label className="form-field">
            <span className="font-medium text-ink/80">Name</span>
            <input
              className="field"
              name="name"
              required
              maxLength={150}
              autoFocus
              defaultValue={product?.name ?? ""}
              placeholder="e.g. DAP fertiliser"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-field">
              <span className="font-medium text-ink/80">Category</span>
              <select className="field" name="category" defaultValue={product?.category ?? "fertiliser"}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="font-medium text-ink/80">Pack size</span>
              <input className="field" name="unit" maxLength={40} defaultValue={product?.unit ?? ""} placeholder="e.g. 50 kg bag" />
            </label>
          </div>
          <label className="form-field">
            <span className="font-medium text-ink/80">Price (KSh)</span>
            <input
              className="field"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={product?.price ?? ""}
              placeholder="Leave empty for “price on request”"
            />
          </label>
          <label className="form-field">
            <span className="font-medium text-ink/80">Description</span>
            <textarea
              className="field min-h-24"
              name="description"
              rows={3}
              defaultValue={product?.description ?? ""}
              placeholder="What it is for, how to use it"
            />
          </label>
          <div className="switch-row !mt-0">
            <div>
              <p className="switch-row__title">In stock</p>
              <p className="switch-row__hint">
                {inStock ? "Farmers can find and order this product." : "Hidden from farmers until you switch it back on."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inStock}
              aria-label="In stock"
              className={`switch ${inStock ? "is-on" : ""}`}
              onClick={() => setInStock((v) => !v)}
            />
          </div>
          <div className="form-field">
            <span className="font-medium text-ink/80">Photo (optional)</span>
            <div className="photo-pick">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPhoto} alt="Product photo" className="photo-pick__img" />
              ) : null}
              <input className="field" name="image" type="file" accept="image/*" onChange={onImage} aria-label="Product photo" />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "List product"}
          </button>
        </div>
      </form>
    </div>
  );
}
