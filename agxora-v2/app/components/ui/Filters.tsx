"use client";

import type { JSX, ReactNode, SelectHTMLAttributes } from "react";

/**
 * Search + filter controls — same surface as FormInput (agx-ui-control).
 */
export function SearchField({
  label = "Search",
  value,
  onChange,
  placeholder,
}: {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}): JSX.Element {
  return (
    <label className="block min-w-0 flex-1 space-y-2">
      <span className="agx-ui-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="agx-ui-control"
      />
    </label>
  );
}

export function FilterSelect({
  label,
  children,
  ...rest
}: {
  readonly label: string;
  readonly children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <label className="block min-w-[140px] space-y-2">
      <span className="agx-ui-label">{label}</span>
      <select className="agx-ui-control" {...rest}>
        {children}
      </select>
    </label>
  );
}
