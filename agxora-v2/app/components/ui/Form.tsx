"use client";

import type {
  InputHTMLAttributes,
  JSX,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function FormField({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span
        className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
      >
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs" role="alert" style={{ color: "#fb7185" }}>
          {error}
        </span>
      ) : hint ? (
        <span
          className="block text-xs"
          style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
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
  return <input {...props} className="agx-ui-control" />;
}

export function FormTextArea(
  props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">,
): JSX.Element {
  return <textarea {...props} className="agx-ui-control" />;
}

export function FormSelect(
  props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    readonly children: ReactNode;
  },
): JSX.Element {
  return (
    <select {...props} className="agx-ui-control">
      {props.children}
    </select>
  );
}
