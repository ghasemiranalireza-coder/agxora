"use client";

import type { JSX, ReactNode, SelectHTMLAttributes } from "react";

const fieldStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
  background: "rgba(255,255,255,0.04)",
  color: "var(--agx-text, #f8fafc)",
} as const;

const focusClass =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_55%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_35%,transparent)]";

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
    <label
      className="block min-w-0 flex-1 space-y-1.5 text-xs"
      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
    >
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={focusClass}
        style={fieldStyle}
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
    <label
      className="block min-w-[140px] space-y-1.5 text-xs"
      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
    >
      {label}
      <select className={focusClass} style={fieldStyle} {...rest}>
        {children}
      </select>
    </label>
  );
}
