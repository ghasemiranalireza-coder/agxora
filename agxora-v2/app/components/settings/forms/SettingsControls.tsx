"use client";

import type { InputHTMLAttributes, JSX, ReactNode, SelectHTMLAttributes } from "react";
import { Card } from "../../ui";

/**
 * Settings form controls — same surfaces as Form/Filters (agx-ui-control).
 */
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
          <h2 className="agx-ui-section-title" style={{ fontSize: 12 }}>
            {title}
          </h2>
          <p className="agx-ui-section-lead">{description}</p>
        </div>
        {actions}
      </div>
      <div className="agx-ui-stack">{children}</div>
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
    <label className="block space-y-2">
      <span className="agx-ui-label">{label}</span>
      {children}
      {hint ? <span className="agx-ui-hint">{hint}</span> : null}
    </label>
  );
}

export function SettingsInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "className">,
): JSX.Element {
  return <input {...props} className="agx-ui-control" />;
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
      className="agx-ui-control"
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
    <select {...rest} className="agx-ui-control">
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
      className="flex items-start justify-between gap-4"
      style={{
        borderRadius: "var(--agx-ds-radius-lg)",
        border: "1px solid var(--agx-ds-border)",
        background: "var(--agx-ds-surface)",
        padding: "var(--agx-ds-space-3) var(--agx-ds-space-4)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--agx-ds-text)" }}
        >
          {label}
        </p>
        {description ? (
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: "var(--agx-ds-text-muted)" }}
          >
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
        className="relative h-6 w-11 shrink-0 rounded-full border transition"
        style={{
          borderColor: checked
            ? "color-mix(in srgb, var(--agx-ds-accent) 45%, transparent)"
            : "var(--agx-ds-border)",
          background: checked
            ? "color-mix(in srgb, var(--agx-ds-accent) 35%, transparent)"
            : "var(--agx-ds-surface-hover)",
          boxShadow: undefined,
        }}
      >
        <span
          className="absolute top-0.5 rounded-full transition-transform"
          style={{
            left: 3,
            width: 18,
            height: 18,
            transform: checked ? "translateX(20px)" : "translateX(0)",
            background: checked
              ? "var(--agx-ds-accent)"
              : "var(--agx-ds-text-muted)",
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
      className="text-xs leading-relaxed"
      style={{
        borderRadius: "var(--agx-ds-radius-md)",
        border: "1px solid var(--agx-ds-border)",
        color: "var(--agx-ds-text-muted)",
        background: "var(--agx-ds-surface)",
        padding: "var(--agx-ds-space-2) var(--agx-ds-space-3)",
      }}
    >
      {children}
    </p>
  );
}
