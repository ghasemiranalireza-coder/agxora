"use client";

import {
  useRef,
  type InputHTMLAttributes,
  type JSX,
  type TextareaHTMLAttributes,
} from "react";
import { VoiceInputButton } from "./VoiceInputButton";

type VoiceInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "value" | "onChange"
> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

type VoiceTextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "value" | "onChange"
> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

/**
 * Text control + microphone. Root accepts FormField id/aria wiring
 * and forwards those attributes onto the native control.
 */
export function VoiceBoundInput({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  "aria-describedby": ariaDescribedBy,
  required,
  ...rest
}: VoiceInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="agx-voice-field">
      <input
        {...rest}
        id={id}
        ref={inputRef}
        className="agx-ui-control"
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-describedby={ariaDescribedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      <VoiceInputButton
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputRef={inputRef}
      />
    </div>
  );
}

export function VoiceBoundTextArea({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  "aria-describedby": ariaDescribedBy,
  required,
  ...rest
}: VoiceTextAreaProps): JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="agx-voice-field">
      <textarea
        {...rest}
        id={id}
        ref={inputRef}
        className="agx-ui-control"
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-describedby={ariaDescribedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      <VoiceInputButton
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputRef={inputRef}
      />
    </div>
  );
}
