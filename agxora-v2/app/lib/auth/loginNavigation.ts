import { destinationAfterLiveSession } from "./serverSessionGate";

/** Same-origin app path. Protocol-relative and absolute URLs stay out. */
export function isSameOriginAppPath(path: string | null | undefined): path is string {
  return Boolean(
    path &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !path.includes("\\") &&
      !path.includes("://"),
  );
}

export type FreshLoginDestinationInput = {
  readonly next: string | null | undefined;
  readonly needsOnboarding: boolean;
  readonly welcomeHref: string;
  readonly checkoutHref: string | null;
};

/**
 * The only destination a successful login submit may navigate to.
 * Invite, onboarding, and checkout win over a generic next path.
 */
export function freshLoginDestination(input: FreshLoginDestinationInput): string {
  if (isSameOriginAppPath(input.next) && input.next.startsWith("/invite/")) {
    return input.next;
  }
  if (input.needsOnboarding && isSameOriginAppPath(input.welcomeHref)) {
    return input.welcomeHref;
  }
  if (input.checkoutHref && isSameOriginAppPath(input.checkoutHref)) {
    return input.checkoutHref;
  }
  if (isSameOriginAppPath(input.next)) return input.next;
  return "/dashboard";
}

/**
 * Redirect for a login page that is already authenticated.
 * Returns null while a fresh login submit owns navigation, so it cannot
 * replace invite, welcome, or checkout.
 */
export function observerLoginRedirect(input: {
  readonly loginNavigationOwned: boolean;
  readonly authenticated: boolean;
  readonly next: string | null | undefined;
}): string | null {
  if (input.loginNavigationOwned || !input.authenticated) return null;
  return destinationAfterLiveSession(input.next);
}
