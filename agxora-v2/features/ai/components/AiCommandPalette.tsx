"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { searchAiCommands } from "../prompts";
import type { AiCommand } from "../types";

export interface AiCommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onRun: (command: AiCommand) => void;
}

/**
 * Remounts when opened so query/index reset without setState-in-effect.
 */
export function AiCommandPalette({
  open,
  onClose,
  onRun,
}: AiCommandPaletteProps): JSX.Element | null {
  if (!open) return null;
  return <AiCommandPaletteOpen onClose={onClose} onRun={onRun} />;
}

function AiCommandPaletteOpen({
  onClose,
  onRun,
}: {
  readonly onClose: () => void;
  readonly onRun: (command: AiCommand) => void;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => searchAiCommands(query), [query]);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, []);

  const run = useCallback(
    (command: AiCommand) => {
      onRun(command);
      onClose();
    },
    [onClose, onRun],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = results[index];
      if (command) run(command);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "color-mix(in srgb, #020617 55%, transparent)" }}
      role="dialog"
      aria-modal="true"
      aria-label="AI command palette"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: "var(--agx-bg-elevated, #0f172a)",
          border:
            "1px solid color-mix(in srgb, var(--agx-border, #334155) 80%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="border-b px-3 py-2"
          style={{
            borderColor:
              "color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="AI command… summarize, propose, analyze…"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--agx-text, #f8fafc)" }}
            aria-label="Filter AI commands"
          />
        </div>
        <ul className="max-h-[360px] overflow-y-auto py-1" role="listbox">
          {results.map((command, i) => {
            const active = i === index;
            return (
              <li key={command.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left"
                  style={{
                    background: active
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                      : "transparent",
                  }}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(command)}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {command.label}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {command.description}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 ? (
            <li
              className="px-3 py-6 text-center text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              No commands found
            </li>
          ) : null}
        </ul>
        <div
          className="border-t px-3 py-2 text-[10px]"
          style={{
            color: "var(--agx-text-muted, #94a3b8)",
            borderColor:
              "color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
          }}
        >
          Register future commands via <code>registerAiCommand</code> — UI stays
          unchanged.
        </div>
      </div>
    </div>
  );
}
