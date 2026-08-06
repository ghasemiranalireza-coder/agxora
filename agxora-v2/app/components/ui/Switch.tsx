"use client";

import { useId, type InputHTMLAttributes, type JSX, type ReactNode } from "react";

/**
 * Shared checkbox — DS surface, focus ring, label rhythm.
 */
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
  id,
  ...rest
}: {
  readonly label: ReactNode;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly id?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange" | "disabled" | "id" | "children"
>): JSX.Element {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className="flex items-start gap-2"
      style={{
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        color: "var(--agx-ds-text)",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <input
        {...rest}
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="agx-ui-checkbox"
        style={{ marginTop: 3 }}
      />
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? (
          <span className="agx-ui-hint mt-1">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Shared switch — used by Settings and feature toggles.
 */
export function Switch({
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
        <p className="text-sm font-medium" style={{ color: "var(--agx-ds-text)" }}>
          {label}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--agx-ds-text-muted)" }}>
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
