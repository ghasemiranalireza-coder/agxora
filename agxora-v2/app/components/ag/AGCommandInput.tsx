"use client";

import type { FormEvent, JSX } from "react";
import { UI } from "../ui/tokens";

export function AGCommandInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  submitLabel,
  onSubmit,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly submitLabel: string;
  readonly onSubmit: () => void;
}): JSX.Element {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: 10 }}
    >
      <label htmlFor={id} style={{ color: UI.color.textMuted, fontSize: 13 }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        <input
          id={id}
          className="agx-ui-control"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          style={{ flex: "1 1 220px", minWidth: 0 }}
        />
        <button
          type="submit"
          className="agx-ui-btn"
          disabled={disabled || !value.trim()}
          style={{
            minHeight: UI.control.height,
            padding: "0 18px",
            borderRadius: UI.radius.md,
            border: "1px solid transparent",
            background:
              "linear-gradient(180deg, #e8d5a8 0%, var(--agx-ds-gold, #c9a66b) 52%, #a9844a 100%)",
            color: "var(--agx-ds-on-gold, #1a140c)",
            fontWeight: 650,
            cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
            opacity: disabled || !value.trim() ? 0.55 : 1,
          }}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
