"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  autoComplete?: string;
  /** id of a <datalist> that offers suggestions */
  list?: string;
  step?: string;
  min?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  hint?: string;
};

export function FormField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  as = "input",
  options,
  autoComplete,
  list,
  step,
  min,
  inputMode,
  hint,
}: Props) {
  const uid = useId();
  const inputId = `${name}-${uid}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="form-field">
      <label htmlFor={inputId} className="font-medium text-ink/80">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={inputId}
          className="field min-h-24"
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      ) : as === "select" ? (
        <select
          id={inputId}
          className="field"
          name={name}
          required={required}
          defaultValue={defaultValue}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : isPassword ? (
        <div className="field-password">
          <input
            id={inputId}
            className="field field--with-toggle"
            name={name}
            type={showPassword ? "text" : "password"}
            required={required}
            defaultValue={defaultValue}
            placeholder={placeholder}
            autoComplete={autoComplete}
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          className="field"
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          list={list}
          step={step}
          min={min}
          inputMode={inputMode}
        />
      )}
      {hint ? <small className="form-field__hint">{hint}</small> : null}
    </div>
  );
}
