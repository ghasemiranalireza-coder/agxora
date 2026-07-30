"use client";

import type { JSX } from "react";
import type { SettingsNavItem, SettingsSectionId } from "../../lib/settings";
import { Card } from "../ui";

export function SettingsNav({
  items,
  active,
  onSelect,
}: {
  readonly items: readonly SettingsNavItem[];
  readonly active: SettingsSectionId;
  readonly onSelect: (id: SettingsSectionId) => void;
}): JSX.Element {
  return (
    <Card className="xl:sticky xl:top-4" padding="12px" hover={false}>
      <p
        className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Control Center
      </p>
      <nav aria-label="Settings sections">
        <ul className="max-h-[min(70vh,720px)] space-y-0.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const selected = item.id === active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  id={`settings-nav-${item.id}`}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                  className="w-full rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    outlineColor: "var(--agx-accent, #22d3ee)",
                    background: selected
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                      : "transparent",
                    color: selected
                      ? "var(--agx-accent, #22d3ee)"
                      : "var(--agx-text, #f8fafc)",
                  }}
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span
                    className="mt-0.5 block text-[11px] leading-snug"
                    style={{
                      color: selected
                        ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 80%, white)"
                        : "var(--agx-text-muted, #94a3b8)",
                    }}
                  >
                    {item.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </Card>
  );
}
