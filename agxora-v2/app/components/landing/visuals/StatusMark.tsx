import type { JSX } from "react";
import type { VisualStatus } from "./model";

/** Text label plus a distinct mark. State is never color alone. */
export function StatusMark({
  tone,
  children,
}: {
  readonly tone: VisualStatus;
  readonly children: string;
}): JSX.Element {
  return (
    <span className={`p31-viz__status p31-viz__status--${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
