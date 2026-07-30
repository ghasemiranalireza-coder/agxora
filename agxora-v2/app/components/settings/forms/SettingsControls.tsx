"use client";

import type { InputHTMLAttributes, JSX, ReactNode, SelectHTMLAttributes } from "react";
import { Card } from "../../ui";

const fieldStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
  background: "rgba(255,255,255,0.04)",
  color: "var(--agx-text, #f8fafc)",
} as const;

export function SettingsPanel({
  title,
  description,
  children,
  actions,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}): JSX.Element {
  return (
    <Card className="space-y-5" padding="24px" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {description}
          </p>
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export function SettingsField({
  label,
  hint,
  children,
}: {
  readonly label: string;
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
      {hint ? (
        <span className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SettingsInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "className">,
): JSX.Element {
  return (
    <input
      {...props}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={{
        ...fieldStyle,
        outlineColor: "var(--agx-accent, #22d3ee)",
      }}
    />
  );
}

export function SettingsTextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}): JSX.Element {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={{
        ...fieldStyle,
        outlineColor: "var(--agx-accent, #22d3ee)",
        resize: "vertical",
      }}
    />
  );
}

export function SettingsSelect({
  children,
  ...rest
}: {
  readonly children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      {...rest}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55"
      style={{
        ...fieldStyle,
        outlineColor: "var(--agx-accent, #22d3ee)",
      }}
    >
      {children}
    </select>
  );
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}): JSX.Element {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
        background: "rgba(255,255,255,0.02)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {label}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          outlineColor: "var(--agx-accent, #22d3ee)",
          borderColor: checked
            ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
            : "var(--agx-card-border, rgba(255,255,255,0.16))",
          background: checked
            ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)"
            : "rgba(255,255,255,0.08)",
        }}
      >
        <span
          className="absolute top-0.5 h-4.5 w-4.5 rounded-full transition-transform"
          style={{
            left: 3,
            width: 18,
            height: 18,
            transform: checked ? "translateX(20px)" : "translateX(0)",
            background: checked ? "var(--agx-accent, #22d3ee)" : "var(--agx-text-muted, #94a3b8)",
          }}
        />
      </button>
    </div>
  );
}

export function SettingsGrid({ children }: { readonly children: ReactNode }): JSX.Element {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

export function SettingsNotice({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <p
      className="rounded-xl border px-3 py-2 text-xs leading-relaxed"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
        color: "var(--agx-text-muted, #94a3b8)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {children}
    </p>
  );
}
