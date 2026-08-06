/**
 * Overlay stack — single Escape owner, scroll-lock depth.
 * All modal/palette layers register here so only the topmost closes.
 */

type CloseHandler = () => void;

const stack: CloseHandler[] = [];
let scrollLockCount = 0;
let previousOverflow = "";

export function pushOverlay(onClose: CloseHandler): () => void {
  stack.push(onClose);
  return () => {
    const idx = stack.lastIndexOf(onClose);
    if (idx >= 0) stack.splice(idx, 1);
  };
}

export function isTopOverlay(onClose: CloseHandler): boolean {
  return stack.length > 0 && stack[stack.length - 1] === onClose;
}

export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = previousOverflow;
    }
  };
}

export const OVERLAY_Z = {
  backdrop: 1000,
  modal: 1010,
  popover: 1020,
  toast: 1030,
  critical: 1040,
} as const;
