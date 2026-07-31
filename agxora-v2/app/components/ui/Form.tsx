"use client";

import type {
  InputHTMLAttributes,
  JSX,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
  background: "rgba(255,255,255,0.04)",
  color: "var(--agx-text, #f8fafc)",
  outlineColor: "var(--agx-accent, #22d3ee)",
} as const;

export function FormField({
  label,
  error,
  hint,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span
        className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs" style={{ color: "#fb7185" }}>
          {error}
        </span>
      ) : hint ? (
        <span
          className="block text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function FormInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "className">,
): JSX.Element {
  return (
    <input
      {...props}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={controlStyle}
    />
  );
}

export function FormTextArea(
  props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">,
): JSX.Element {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={controlStyle}
    />
  );
}

export function FormSelect(
  props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    readonly children: ReactNode;
  },
): JSX.Element {
  return (
    <select
      {...props}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={controlStyle}
    />
  );
}
