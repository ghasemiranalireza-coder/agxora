/**
 * Accessibility helpers — focus and keyboard navigation architecture.
 * Does not alter existing layouts; call from interactive surfaces as needed.
 */

/** Move focus to an element without scrolling when supported. */
export function focusElement(
  el: HTMLElement | null | undefined,
  options?: FocusOptions,
): void {
  if (!el) return;
  try {
    el.focus({ preventScroll: true, ...options });
  } catch {
    el.focus();
  }
}

/** Return true when the event is an activation key (Enter / Space). */
export function isActivationKey(event: {
  readonly key: string;
}): boolean {
  return event.key === "Enter" || event.key === " ";
}

/** Announce a message via a live region element if present. */
export function announceToLiveRegion(
  message: string,
  regionId = "agxora-live-region",
): void {
  if (typeof document === "undefined") return;
  const region = document.getElementById(regionId);
  if (!region) return;
  region.textContent = "";
  // Force reflow so repeated identical messages are announced.
  void region.offsetWidth;
  region.textContent = message;
}
