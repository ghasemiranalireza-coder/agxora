"use client";

import { useMemo, useState, type CSSProperties, type JSX } from "react";
import { useRouter } from "next/navigation";
import {
  BUSINESS_TYPE_META,
  type BusinessType,
  useBusinessOs,
} from "../../lib/business";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";
import { useT } from "../../lib/i18n";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `backdrop-filter ${THEME_TRANSITION_MS}ms ease`,
].join(", ");

type Step = 0 | 1 | 2 | 3;

const GOAL_OPTIONS = [
  "Increase revenue",
  "Improve operations",
  "Delight customers",
  "Reduce costs",
  "Scale with AI",
] as const;

const GOAL_I18N_KEYS: Record<(typeof GOAL_OPTIONS)[number], string> = {
  "Increase revenue": "increaseRevenue",
  "Improve operations": "improveOperations",
  "Delight customers": "delightCustomers",
  "Reduce costs": "reduceCosts",
  "Scale with AI": "scaleWithAi",
};

const STEP_KEYS = ["type", "company", "locale", "goals"] as const;

export function OnboardingWizard(): JSX.Element {
  const t = useT();
  const { tokens } = useTheme();
  const router = useRouter();
  const { activateBusiness, primaryTemplate } = useBusinessOs();

  const [step, setStep] = useState<Step>(0);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("United States");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [goals, setGoals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () => (businessType ? primaryTemplate(businessType) : null),
    [businessType, primaryTemplate],
  );

  const canContinue = (): boolean => {
    if (step === 0) return businessType !== null;
    if (step === 1) return companyName.trim().length >= 2;
    if (step === 2) return country.trim().length > 0;
    return true;
  };

  const toggleGoal = (goal: string): void => {
    setGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  };

  const finish = async (): Promise<void> => {
    if (!businessType || !template) return;
    setSubmitting(true);
    setError(null);
    try {
      const organizationId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `org_${crypto.randomUUID()}`
          : `org_${Date.now().toString(36)}`;

      activateBusiness({
        organizationId,
        companyName: companyName.trim(),
        businessType,
        templateId: template.id,
        country: country.trim(),
        language: language.trim() || "en",
        timezone: timezone.trim() || "UTC",
        goals,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("onboarding.failed"));
      setSubmitting(false);
    }
  };

  const next = (): void => {
    if (!canContinue()) return;
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    void finish();
  };

  const back = (): void => {
    if (step === 0) return;
    setStep((step - 1) as Step);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "920px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 36px)",
      }}
    >
      <div
        className="agx-glass-panel"
        style={{
          borderRadius: "28px",
          padding: "clamp(22px, 4vw, 36px)",
          background: tokens.panelBg,
          border: `1px solid ${tokens.panelBorder}`,
          boxShadow: tokens.panelShadow,
          backdropFilter: tokens.cardBlur,
          WebkitBackdropFilter: tokens.cardBlur,
          color: tokens.text,
          transition: surfaceTransition,
        }}
      >
        <p
          style={{
            margin: 0,
            color: tokens.accent,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {t("onboarding.eyebrow")}
        </p>
        <h1
          style={{
            margin: "12px 0 8px",
            fontSize: "clamp(28px, 6vw, 42px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textShadow: tokens.titleShadow,
          }}
        >
          {t("onboarding.title")}
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            color: tokens.textMuted,
            fontSize: "15px",
            lineHeight: 1.6,
            maxWidth: "54ch",
          }}
        >
          {t("onboarding.lead")}
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {STEP_KEYS.map((key, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <div
                key={key}
                style={{
                  flex: "1 1 70px",
                  minWidth: "70px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: `1px solid ${
                    active || done ? tokens.accentSoft : tokens.divider
                  }`,
                  background: active ? tokens.navActiveBg : tokens.chatBubbleBg,
                  color: active || done ? tokens.accent : tokens.textMuted,
                  fontSize: "12px",
                  fontWeight: 650,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  transition: surfaceTransition,
                }}
              >
                {t(`onboarding.steps.${key}`)}
              </div>
            );
          })}
        </div>

        {step === 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
              gap: "12px",
            }}
          >
            {BUSINESS_TYPE_META.map((item) => {
              const selected = businessType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setBusinessType(item.type)}
                  className="agx-metric-card"
                  style={{
                    textAlign: "left",
                    padding: "16px",
                    borderRadius: "16px",
                    border: `1px solid ${
                      selected ? tokens.accent : tokens.cardBorder
                    }`,
                    background: selected ? tokens.navActiveBg : tokens.cardBg,
                    boxShadow: selected
                      ? tokens.navActiveGlow
                      : tokens.cardShadow,
                    color: tokens.text,
                    cursor: "pointer",
                    transition: surfaceTransition,
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "12px",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: "12px",
                      background: tokens.chatReplyBg,
                      color: tokens.accent,
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: tokens.textMuted,
                      fontSize: "12.5px",
                      lineHeight: 1.45,
                    }}
                  >
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 1 ? (
          <div style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: tokens.textMuted }}>
                {t("onboarding.companyName")}
              </span>
              <input
                className="agx-input"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder={t("onboarding.companyPlaceholder")}
                style={inputStyle(tokens)}
              />
            </label>
            {template ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  border: `1px solid ${tokens.panelBorder}`,
                  background: tokens.chatBubbleBg,
                }}
              >
                <div
                  style={{
                    color: tokens.accent,
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {t("onboarding.template")}
                </div>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                  {template.name}
                </div>
                <div style={{ color: tokens.textMuted, fontSize: "13.5px" }}>
                  {template.summary}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: tokens.textMuted }}>
                {t("onboarding.country")}
              </span>
              <input
                className="agx-input"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                style={inputStyle(tokens)}
              />
            </label>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: tokens.textMuted }}>
                {t("onboarding.language")}
              </span>
              <input
                className="agx-input"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder={t("onboarding.languagePlaceholder")}
                style={inputStyle(tokens)}
              />
            </label>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: tokens.textMuted }}>
                {t("onboarding.timezone")}
              </span>
              <input
                className="agx-input"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder={t("onboarding.timezonePlaceholder")}
                style={inputStyle(tokens)}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div
            style={{
              display: "grid",
              gap: "10px",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            }}
          >
            {GOAL_OPTIONS.map((goal) => {
              const selected = goals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${
                      selected ? tokens.accent : tokens.cardBorder
                    }`,
                    background: selected ? tokens.navActiveBg : tokens.cardBg,
                    color: selected ? tokens.accent : tokens.text,
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: 600,
                    transition: surfaceTransition,
                  }}
                >
                  {t(`onboarding.goals.${GOAL_I18N_KEYS[goal]}`)}
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p
            style={{
              marginTop: "18px",
              color: tokens.accent,
              fontSize: "13px",
            }}
          >
            {error}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            style={{
              ...buttonStyle(tokens, false),
              opacity: step === 0 ? 0.45 : 1,
              cursor: step === 0 ? "not-allowed" : "pointer",
            }}
          >
            {t("onboarding.back")}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue() || submitting}
            style={{
              ...buttonStyle(tokens, true),
              opacity: !canContinue() || submitting ? 0.55 : 1,
              cursor:
                !canContinue() || submitting ? "not-allowed" : "pointer",
              marginLeft: "auto",
            }}
          >
            {step === 3
              ? submitting
                ? t("onboarding.launching")
                : t("onboarding.enterDashboard")
              : t("onboarding.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle(tokens: {
  inputBorder: string;
  inputBg: string;
  text: string;
}): CSSProperties {
  return {
    width: "100%",
    padding: "0 16px",
    borderRadius: "12px",
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    outline: "none",
    fontSize: "13px",
    minHeight: 40,
  };
}

function buttonStyle(
  tokens: {
    panelBorder: string;
    chatReplyBg: string;
    chatBubbleBg: string;
    accent: string;
    text: string;
  },
  primary: boolean,
): CSSProperties {
  return {
    padding: "0 16px",
    minHeight: 40,
    borderRadius: "12px",
    border: `1px solid ${tokens.panelBorder}`,
    background: primary ? tokens.chatReplyBg : tokens.chatBubbleBg,
    color: primary ? tokens.accent : tokens.text,
    fontSize: "13px",
    fontWeight: 650,
    letterSpacing: "0.01em",
    textTransform: "none" as const,
  };
}
