type Props = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
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
}: Props) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-ink/80">{label}</span>
      {as === "textarea" ? (
        <textarea
          className="field min-h-24"
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      ) : as === "select" ? (
        <select
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
      ) : (
        <input
          className="field"
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
