"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { SAAS_MODULES } from "../lib/saas/modules";
import { useTheme } from "../lib/theme";

/**
 * Command palette architecture — keyboard-first navigation.
 * Visual treatment stays within existing glass tokens.
 */
export function CommandPalette(): JSX.Element | null {
  const { tokens } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("agxora:command-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agxora:command-palette", onCustom);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAAS_MODULES;
    return SAAS_MODULES.filter(
      (module) =>
        module.label.toLowerCase().includes(q) ||
        module.description.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open) return null;

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && results[0]) {
      router.push(results[0].href);
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(2,6,23,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 20,
          border: `1px solid ${tokens.panelBorder}`,
          background: tokens.panelBg,
          boxShadow: tokens.panelShadow,
          backdropFilter: tokens.cardBlur,
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search modules…"
          aria-label="Command search"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            padding: "16px 18px",
            background: "transparent",
            color: tokens.text,
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "0 8px 8px" }}>
          {results.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => {
                router.push(module.href);
                setOpen(false);
                setQuery("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                color: tokens.text,
                padding: "12px 10px",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: tokens.accent }}>
                {module.label}
              </div>
              <div style={{ fontSize: 12, color: tokens.textMuted }}>
                {module.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
