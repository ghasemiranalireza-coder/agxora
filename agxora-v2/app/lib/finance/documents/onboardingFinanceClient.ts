import { isServerAuthMode } from "@/app/lib/auth/mode";
import {
  buildOnboardingFinancePatch,
  hasOnboardingFinancePatch,
  type OnboardingFinanceInput,
} from "./onboardingFinanceSeed";

const DOCUMENT_SETTINGS_PATH = "/api/v1/finance/document-settings";

export type PersistOnboardingFinanceOptions = {
  readonly enabled?: boolean;
  readonly fetch?: typeof fetch;
};

/**
 * Write supported onboarding company fields into FinanceDocumentSettings
 * through the existing authenticated PATCH API. Local/demo auth skips the
 * write because there is no server actor.
 */
export async function persistOnboardingFinanceSettings(
  input: OnboardingFinanceInput,
  options: PersistOnboardingFinanceOptions = {},
): Promise<void> {
  const enabled = options.enabled ?? isServerAuthMode();
  if (!enabled) {
    return;
  }

  const patch = buildOnboardingFinancePatch(input);
  if (!hasOnboardingFinancePatch(patch)) {
    return;
  }

  const fetchFn = options.fetch ?? fetch;
  const response = await fetchFn(DOCUMENT_SETTINGS_PATH, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error("onboarding.financeSaveFailed");
  }
}
