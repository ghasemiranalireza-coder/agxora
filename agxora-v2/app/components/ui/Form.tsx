"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type JSX,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type ControlAriaProps = {
  id?: string;
  required?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

/**
 * Form field — auto id wiring, required marker, error/hint a11y.
 */
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
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, !error && hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="block space-y-2">
      <label className="agx-ui-label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: "var(--agx-ds-danger)" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<ControlAriaProps>;
        return cloneElement(el, {
          id: el.props.id ?? fieldId,
          required: required || el.props.required,
          "aria-invalid": error ? true : el.props["aria-invalid"],
          "aria-required": required || el.props["aria-required"],
          "aria-describedby":
            describedBy || el.props["aria-describedby"],
        });
      })}
      {error ? (
        <span className="agx-ui-error" role="alert" id={errorId}>
          {error}
        </span>
      ) : hint ? (
        <span className="agx-ui-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
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
