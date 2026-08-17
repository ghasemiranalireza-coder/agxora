"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const localeRef = useRef(locale);
  const activeIndexRef = useRef(0);
  localeRef.current = locale;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, SUPPORTED_LOCALES.indexOf(locale)),
  );
  activeIndexRef.current = activeIndex;

  const close = useCallback(() => setOpen(false), []);

  const toggleMenu = useCallback(() => {
    setActiveIndex(Math.max(0, SUPPORTED_LOCALES.indexOf(localeRef.current)));
    setOpen((wasOpen) => !wasOpen);
  }, []);

  const choose = useCallback(
    (next: AppLocale) => {
      setLocale(next);
      setOpen(false);
    },
    [setLocale],
  );

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return undefined;

    const onTriggerClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu();
    };
    const onTriggerKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setActiveIndex(Math.max(0, SUPPORTED_LOCALES.indexOf(localeRef.current)));
        setOpen(true);
      }
    };

    trigger.addEventListener("click", onTriggerClick);
    trigger.addEventListener("keydown", onTriggerKeyDown);
    return () => {
      trigger.removeEventListener("click", onTriggerClick);
      trigger.removeEventListener("keydown", onTriggerKeyDown);
    };
  }, [toggleMenu]);

  useEffect(() => {
    if (!open) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const onDocumentPointer = (event: MouseEvent) => {
      if (!root.contains(event.target as Node)) close();
    };
    const onDocumentKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const onRootClick = (event: MouseEvent) => {
      const option = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-locale]",
      );
      if (!option || !root.contains(option)) return;
      const next = option.getAttribute("data-locale");
      if (next && SUPPORTED_LOCALES.includes(next as AppLocale)) {
        event.preventDefault();
        event.stopPropagation();
        choose(next as AppLocale);
      }
    };
    const onListKeyDown = (event: KeyboardEvent) => {
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
        choose(SUPPORTED_LOCALES[activeIndexRef.current]);
      }
    };

    document.addEventListener("mousedown", onDocumentPointer);
    document.addEventListener("keydown", onDocumentKey);
    root.addEventListener("click", onRootClick);
    const list = root.querySelector<HTMLElement>('[role="listbox"]');
    list?.addEventListener("keydown", onListKeyDown);
    list?.focus();
    return () => {
      document.removeEventListener("mousedown", onDocumentPointer);
      document.removeEventListener("keydown", onDocumentKey);
      root.removeEventListener("click", onRootClick);
      list?.removeEventListener("keydown", onListKeyDown);
    };
  }, [open, close, choose]);

  useEffect(() => {
    if (!open) return;
    const option = rootRef.current?.querySelector<HTMLElement>(
      `[data-locale-index="${activeIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

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
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="agx-lang-switcher__trigger"
        aria-label={t("common.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
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
        >
          {SUPPORTED_LOCALES.map((code, index) => (
            <button
              key={code}
              type="button"
              id={`${triggerId}-opt-${code}`}
              role="option"
              data-locale={code}
              data-locale-index={index}
              className={
                index === activeIndex
                  ? "agx-lang-switcher__option is-active"
                  : "agx-lang-switcher__option"
              }
              aria-selected={code === locale}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
