import type { JSX } from "react";

interface AgxoraLogoProps {
  readonly compact?: boolean;
}

/** Gold diamond mark + tracked wordmark — pure SVG/CSS, no assets. */
export function AgxoraLogo({ compact = false }: AgxoraLogoProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ffd57a] via-[#f2b23e] to-[#d98f1f] shadow-[0_6px_18px_rgba(242,178,62,0.35)]">
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="#221302"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 4.5 21" />
          <path d="M12 3l7.5 18" />
          <path d="M7 15.5h10" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[0.28em] text-agx-ink">
          AGXORA
        </span>
      )}
    </span>
  );
}
