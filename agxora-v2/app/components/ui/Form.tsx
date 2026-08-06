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
  required,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  readonly required?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="agx-ui-label">
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "var(--agx-ds-danger)" }}>
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="agx-ui-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="agx-ui-hint">{hint}</span>
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
