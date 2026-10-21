"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CloseIcon, PlusIcon } from "@/components/Icons";

const MAX_TAGS = 20;
const tidy = (value: string) => {
  const t = value.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Type a crop and press Enter (or comma) to add it as a chip; Backspace removes the last chip.
 * Submits as one comma-separated string in a hidden input named `name`, which is what the API stores.
 */
export function TagInput({
  name,
  label,
  defaultValue = [],
  suggestions = [],
  placeholder = "Type a crop and press Enter",
  focusKey,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  suggestions?: readonly string[];
  placeholder?: string;
  /** Lets the dialog focus this field by name (see EditProfileDialog). */
  focusKey?: string;
}) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  const has = (t: string) => tags.some((x) => x.toLowerCase() === t.toLowerCase());

  function add(raw: string) {
    const t = tidy(raw);
    if (!t || has(t) || tags.length >= MAX_TAGS) return;
    setTags((list) => [...list, t]);
  }

  function commit() {
    // "Maize, beans" pasted or typed in one go becomes two chips.
    draft.split(/[,;]+/).forEach(add);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && tags.length) {
      setTags((list) => list.slice(0, -1));
    }
  }

  const remaining = suggestions.filter((s) => !has(s)).slice(0, 10);

  return (
    <div className="form-field">
      <label htmlFor={`${uid}-input`} className="font-medium text-ink/80">
        {label}
      </label>
      <div className="tag-input" onClick={() => inputRef.current?.focus()}>
        {tags.map((t) => (
          <span key={t} className="tag-input__chip">
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                setTags((list) => list.filter((x) => x !== t));
              }}
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={`${uid}-input`}
          data-field={focusKey ?? name}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={tags.length ? "Add another…" : placeholder}
          autoComplete="off"
          maxLength={40}
        />
      </div>
      <input type="hidden" name={name} value={tags.join(", ")} />
      {remaining.length ? (
        <div className="tag-input__suggest" aria-label="Suggested crops">
          <span>Add:</span>
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}>
              <PlusIcon size={11} /> {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
