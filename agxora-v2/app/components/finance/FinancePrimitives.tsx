"use client";

import type { JSX, ReactNode } from "react";
import { Badge, Button, Card, Section } from "../ui";
import type { BadgeTone, ButtonVariant } from "../ui";

function isTailwindPadding(value: string): boolean {
  return value.split(/\s+/).some((token) => /(^|:)p[trblxy]?-/.test(token));
}

/** Finance glass card — shared Card system (presentation only). */
export function FinanceGlassCard({
  children,
  className = "",
  padding = "p-5",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly padding?: string;
}): JSX.Element {
  const tw = isTailwindPadding(padding);
  return (
    <Card
      className={tw ? `${padding} ${className}`.trim() : className}
      padding={tw ? null : padding}
    >
      {children}
    </Card>
  );
}

export function FinanceSection({
  id,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly delay?: number;
}): JSX.Element {
  return (
    <Section id={id} title={title} subtitle={subtitle} delay={delay}>
      {children}
    </Section>
  );
}

export function FinanceBadge({
  children,
  tone = "default",
}: {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}): JSX.Element {
  return <Badge tone={tone}>{children}</Badge>;
}

export function FinanceButton({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  disabled = false,
  title,
}: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "secondary";
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
  readonly title?: string;
}): JSX.Element {
  return (
    <Button
      type={type}
      variant={variant as ButtonVariant}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}
