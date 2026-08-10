"use client";

import { useId, type JSX, type ReactNode, type SelectHTMLAttributes } from "react";

/**
 * Search + filter controls — same surface as FormInput (agx-ui-control).
 * Entire labeled field is clickable via native <label> wrapping.
 */
export function SearchField({
  label = "Search",
  value,
  onChange,
  placeholder,
  controlSize = "md",
}: {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly controlSize?: "sm" | "md";
}): JSX.Element {
  const id = useId();
  return (
    <label className="block min-w-0 flex-1 space-y-2" htmlFor={id}>
      <span className="agx-ui-label">{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          controlSize === "sm"
            ? "agx-ui-control agx-ui-control--sm"
            : "agx-ui-control"
        }
        autoComplete="off"
      />
    </label>
  );
}

export function FilterSelect({
  label,
  children,
  className,
  controlSize = "md",
  id: idProp,
  ...rest
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly controlSize?: "sm" | "md";
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">): JSX.Element {
  const autoId = useId();
  const id = idProp ?? autoId;
  const controlClass = [
    "agx-ui-control",
    controlSize === "sm" ? "agx-ui-control--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className="block min-w-[160px] flex-1 space-y-2" htmlFor={id}>
      <span className="agx-ui-label">{label}</span>
      <select {...rest} id={id} className={controlClass}>
        {children}
      </select>
    </label>
  );
}
