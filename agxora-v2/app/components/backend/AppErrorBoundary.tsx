"use client";

import {
  Component,
  type ErrorInfo,
  type JSX,
  type ReactNode,
} from "react";
import Link from "next/link";
import { resolveAppError, type AppErrorCode } from "@/app/lib/backend/errors";
import { Button, Card } from "@/app/components/ui";
import { sanitizeClientErrorMessage } from "@/app/lib/production/safeErrorMessage";
import { isTranslationKey, resolveUserFacingErrorKey, useT } from "@/app/lib/i18n";

type Props = {
  readonly children: ReactNode;
  readonly fallbackCode?: AppErrorCode;
};

type State = {
  error: Error | null;
};

/**
 * Global error boundary — architecture host.
 * Keeps existing module UIs unchanged; only catches render failures.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void import("@/app/lib/production/observability").then(({ reportError }) => {
      reportError(error, {
        source: "AppErrorBoundary",
        componentStack: (info.componentStack ?? "").slice(0, 400),
      });
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const shape = resolveAppError(this.props.fallbackCode ?? "INTERNAL");

    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
        <ErrorPanel
          title={shape.title}
          message={shape.message}
          retryable={shape.retryable}
          onRetry={this.retry}
        />
      </div>
    );
  }
}

export function ErrorPanel({
  title,
  message,
  retryable = true,
  onRetry,
  code,
}: {
  readonly title: string;
  readonly message: string;
  readonly retryable?: boolean;
  readonly onRetry?: () => void;
  readonly code?: string;
}): JSX.Element {
  const t = useT();
  const titleKey = isTranslationKey(title)
    ? title
    : resolveUserFacingErrorKey(title, "backend.errorBoundary.title");
  const messageKey = isTranslationKey(message)
    ? message
    : resolveUserFacingErrorKey(message, "errors.codes.COMMON_SOMETHING_WENT_WRONG");
  const displayTitle = t(titleKey);
  const translatedMessage = t(messageKey);
  const safeMessage = sanitizeClientErrorMessage(
    translatedMessage,
    t("errors.codes.COMMON_SOMETHING_WENT_WRONG"),
  );
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center" padding="32px" hover={false}>
      {code ? (
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {code}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {displayTitle}
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {safeMessage}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {retryable && onRetry ? (
          <Button variant="primary" size="sm" onClick={onRetry}>
            {t("backend.errorBoundary.retry")}
          </Button>
        ) : null}
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            {t("backend.errorBoundary.backToDashboard")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
