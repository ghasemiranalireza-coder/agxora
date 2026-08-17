"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from "./locale";
import { useLocale } from "./LocaleProvider";
import "./language-switcher.css";

/**
 * Compact language selector — one controlled pattern for public + settings.
 * Uses a constrained listbox because native <select> in RTL expands in-page.
 */
export function LanguageSwitcher({
  id,
  size = "sm",
  className = "",
}: {
  readonly id?: string;
  readonly size?: "sm" | "md";
  readonly className?: string;
}): JSX.Element {
  const { locale, setLocale, t } = useLocale();
  const autoId = useId();
  const triggerId = id ?? `agxora-language-${autoId}`;
  const listId = `${triggerId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const close = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    setActiveIndex(Math.max(0, SUPPORTED_LOCALES.indexOf(locale)));
    setOpen(true);
  }, [locale]);

  const choose = useCallback(
    (next: AppLocale) => {
      setLocale(next);
      setOpen(false);
    },
    [setLocale],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="listbox"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = rootRef.current?.querySelector<HTMLElement>(
      `[data-locale-index="${activeIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % SUPPORTED_LOCALES.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + SUPPORTED_LOCALES.length) % SUPPORTED_LOCALES.length,
      );
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(SUPPORTED_LOCALES.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(SUPPORTED_LOCALES[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const rootClass = [
    "agx-lang-switcher",
    size === "md" ? "agx-lang-switcher--md" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        type="button"
        id={triggerId}
        className="agx-lang-switcher__trigger"
        aria-label={t("common.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="agx-lang-switcher__label">{LOCALE_LABELS[locale]}</span>
        <span className="agx-lang-switcher__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={listId}
          className="agx-lang-switcher__list"
          role="listbox"
          aria-label={t("common.language")}
          aria-activedescendant={`${triggerId}-opt-${SUPPORTED_LOCALES[activeIndex]}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {SUPPORTED_LOCALES.map((code, index) => (
            <button
              key={code}
              type="button"
              id={`${triggerId}-opt-${code}`}
              role="option"
              data-locale-index={index}
              className={
                index === activeIndex
                  ? "agx-lang-switcher__option is-active"
                  : "agx-lang-switcher__option"
              }
              aria-selected={code === locale}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(code)}
            >
              {LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
