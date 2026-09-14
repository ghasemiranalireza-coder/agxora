import type {
  GuardianRiskLevel,
  ObservationSeverity,
  RemediationClass,
} from "./types";

const HIGH_RISK_PATH = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)prisma\//i,
  /schema\.prisma$/i,
  /(^|\/)migrations\//i,
  /\/auth\//i,
  /\/tenancy\//i,
  /\/oauth\//i,
  /credentials/i,
  /billing/i,
  /payment/i,
  /dns/i,
  /vercel\.json$/i,
  /production\/env/i,
];

const HIGH_RISK_TEXT =
  /\b(oauth|credential|authorization|tenant isolation|dns|environment variable|prisma migration|billing|payment|production env|secret)\b/i;

export function severityToRisk(severity: ObservationSeverity): GuardianRiskLevel {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

export function classifyRemediation(input: {
  readonly files: readonly string[];
  readonly summary: string;
  readonly category: string;
}): { readonly classification: RemediationClass; readonly riskLevel: GuardianRiskLevel } {
  const files = input.files;
  const highPath = files.some((file) => HIGH_RISK_PATH.some((pattern) => pattern.test(file)));
  const highText = HIGH_RISK_TEXT.test(input.summary) || HIGH_RISK_TEXT.test(input.category);
  const securityCategory =
    input.category === "security" ||
    input.category === "configuration" ||
    input.category === "production_health";
  if (highPath || highText || securityCategory) {
    return { classification: "human_review", riskLevel: "high" };
  }
  const testOnly = files.length > 0 && files.every((file) => /\.test\.(ts|tsx|js)$/.test(file));
  if (testOnly) {
    return { classification: "safe_auto", riskLevel: "low" };
  }
  return { classification: "safe_auto", riskLevel: "medium" };
}

export function lowRiskDoesNotAuthorizeProduction(): true {
  return true;
}
