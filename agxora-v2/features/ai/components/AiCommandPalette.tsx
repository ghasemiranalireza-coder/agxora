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
import { createPortal } from "react-dom";
import {
  isTopOverlay,
  lockBodyScroll,
  OVERLAY_Z,
  pushOverlay,
} from "@/app/components/ui/overlayStack";
import { searchAiCommands } from "../prompts";
import type { AiCommand } from "../types";

export interface AiCommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onRun: (command: AiCommand) => void;
}

/**
 * AI command palette — same overlay contract as Universal Search
 * (portal, Escape stack, scroll lock, DS scrim/elevated).
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
}): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const results = useMemo(() => searchAiCommands(query), [query]);

  useEffect(() => {
    const close = (): void => onCloseRef.current();
    const pop = pushOverlay(close);
    const unlock = lockBodyScroll();
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onEsc = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (!isTopOverlay(close)) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onEsc, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onEsc, true);
      pop();
      unlock();
    };
  }, []);

  const run = useCallback(
    (command: AiCommand) => {
      onRun(command);
      onClose();
    },
    [onClose, onRun],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center px-4 pt-[12vh]"
      style={{
        zIndex: OVERLAY_Z.popover,
        background: "var(--agx-ds-scrim)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AI command palette"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden border shadow-2xl"
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          background: "var(--agx-ds-elevated)",
          border: "1px solid var(--agx-ds-border)",
          boxShadow: "var(--agx-ds-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="border-b px-3 py-2"
          style={{ borderColor: "var(--agx-ds-border)" }}
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
            className="agx-ui-control"
            style={{ border: "none", background: "transparent", boxShadow: "none" }}
            aria-label="Filter AI commands"
          />
        </div>
        <ul className="max-h-72 overflow-auto p-2" role="listbox">
          {results.length === 0 ? (
            <li
              className="px-3 py-4 text-sm"
              style={{ color: "var(--agx-ds-text-muted)" }}
            >
              No matching commands
            </li>
          ) : (
            results.map((command, i) => {
              const active = i === index;
              return (
                <li key={command.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left"
                    style={{
                      background: active
                        ? "color-mix(in srgb, var(--agx-ds-accent) 12%, transparent)"
                        : "transparent",
                      color: "var(--agx-ds-text)",
                    }}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => run(command)}
                  >
                    <span className="text-sm font-medium">{command.label}</span>
                    {command.description ? (
                      <span
                        className="text-xs"
                        style={{ color: "var(--agx-ds-text-muted)" }}
                      >
                        {command.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div
          className="border-t px-3 py-2 text-[10px]"
          style={{
            color: "var(--agx-ds-text-muted)",
            borderColor: "var(--agx-ds-border)",
          }}
        >
          Register future commands via <code>registerAiCommand</code> — UI stays
          unchanged.
        </div>
      </div>
    </div>,
    document.body,
  );
}
