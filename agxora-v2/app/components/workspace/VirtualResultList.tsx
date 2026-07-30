"use client";

import { useMemo, useRef, useState, type JSX, type ReactNode, type UIEvent } from "react";

const ROW_HEIGHT = 64;
const OVERSCAN = 6;

/**
 * Lightweight virtualized list — no external dependency.
 * Renders only the visible window for large result sets.
 */
export function VirtualResultList<T>({
  items,
  height = 320,
  renderItem,
  getKey,
}: {
  readonly items: readonly T[];
  readonly height?: number;
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly getKey: (item: T, index: number) => string;
}): JSX.Element {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end, offsetY, totalHeight } = useMemo(() => {
    const total = items.length * ROW_HEIGHT;
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(height / ROW_HEIGHT) + OVERSCAN * 2;
    const endIdx = Math.min(items.length, startIdx + visible);
    return {
      start: startIdx,
      end: endIdx,
      offsetY: startIdx * ROW_HEIGHT,
      totalHeight: total,
    };
  }, [items.length, scrollTop, height]);

  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const slice = items.slice(start, end);

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="overflow-y-auto pr-1"
      style={{ height }}
      role="listbox"
      aria-label="Search results"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => (
            <div key={getKey(item, start + i)} style={{ height: ROW_HEIGHT }}>
              {renderItem(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
