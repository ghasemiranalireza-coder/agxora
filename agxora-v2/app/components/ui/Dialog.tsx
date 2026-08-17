"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type JSX,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  isTopOverlay,
  lockBodyScroll,
  OVERLAY_Z,
  pushOverlay,
} from "./overlayStack";
import { useT } from "../../lib/i18n";

/**
 * AGXORA Dialog — single modal primitive.
 * Portals to document.body (outside dashboard isolation / page-enter opacity).
 * Owns Escape only when topmost; locks body scroll; focus traps; solid panel
 * (no backdrop-filter) so native selects paint above the panel.
 * Sticky header/footer with scrollable body so actions stay reachable.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
  dismissible = true,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
  /** When false, Escape / backdrop / close button do not dismiss (e.g. while saving). */
  readonly dismissible?: boolean;
}): JSX.Element | null {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    dismissibleRef.current = dismissible;
  }, [dismissible]);

  const requestClose = useCallback((): void => {
    if (!dismissibleRef.current) return;
    onCloseRef.current();
  }, []);

  const focusFirst = useCallback((): void => {
    const panel = panelRef.current;
    if (!panel) return;
    const autofocus = panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
    if (autofocus && !autofocus.hasAttribute("disabled")) {
      autofocus.focus();
      return;
    }
    const invalid = panel.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      invalid.focus();
      return;
    }
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const target = focusable[0] ?? panel;
    target.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    const close = (): void => {
      if (!dismissibleRef.current) return;
      onCloseRef.current();
    };
    const pop = pushOverlay(close);
    const unlock = lockBodyScroll();
    const frame = window.requestAnimationFrame(() => focusFirst());

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (!isTopOverlay(close)) return;
        if (!dismissibleRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      if (!isTopOverlay(close)) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      pop();
      unlock();
      previouslyFocused.current?.focus?.();
    };
  }, [open, focusFirst]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="agx-ui-overlay fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: OVERLAY_Z.modal,
        background: "var(--agx-ds-scrim)",
      }}
      onClick={requestClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`agx-ui-dialog-panel flex max-h-[90vh] w-full flex-col border outline-none ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          borderColor: "var(--agx-ds-border)",
          background: "var(--agx-ds-elevated)",
          boxShadow: "var(--agx-ds-shadow-lg)",
          color: "var(--agx-ds-text)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: "var(--agx-ds-border)" }}
        >
          <h3
            id={titleId}
            className="text-lg font-semibold"
            style={{ color: "var(--agx-ds-text)" }}
          >
            {title}
          </h3>
          <button
            type="button"
            aria-label={t("ui.dialog.close")}
            disabled={!dismissible}
            onClick={requestClose}
            className="inline-flex items-center justify-center rounded-xl border text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            style={{
              borderColor: "var(--agx-ds-border)",
              color: "var(--agx-ds-text-muted)",
              background: "var(--agx-ds-surface)",
              outlineColor: "var(--agx-ds-accent)",
              minHeight: 44,
              minWidth: 44,
              padding: "0 12px",
            }}
          >
            {t("common.close")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div
            className="flex shrink-0 flex-wrap justify-end gap-2 border-t px-5 py-4"
            style={{ borderColor: "var(--agx-ds-border)" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
