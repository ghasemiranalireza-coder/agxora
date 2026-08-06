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

/** Settings toggle — shared Switch (single DS control). */
export { Switch as SettingsToggle } from "../../ui/Switch";

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
