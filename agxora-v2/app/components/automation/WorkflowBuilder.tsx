"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import type { CatalogItem, WorkflowDefinition, WorkflowNode } from "../../lib/automation";
import {
  addNode,
  AI_ACTIONS,
  AVAILABLE_ACTIONS,
  AVAILABLE_TRIGGERS,
  cloneWorkflow,
  connectNodes,
  createNodeId,
  GRID_SIZE,
  moveNode,
  WORKFLOW_ELEMENTS,
} from "../../lib/automation";
import { Badge, Button, Card, EmptyState } from "../ui";
import { useT } from "@/app/lib/i18n";

const NODE_W = 168;
const NODE_H = 72;

type DragMode =
  | { readonly kind: "node"; readonly id: string; readonly ox: number; readonly oy: number }
  | { readonly kind: "pan"; readonly ox: number; readonly oy: number }
  | null;

function kindTone(kind: string): "default" | "accent" | "positive" | "warning" {
  if (kind.includes("ai") || kind === "ai_action" || kind === "ai_decision") return "accent";
  if (kind === "trigger") return "positive";
  if (kind === "condition" || kind === "approval") return "warning";
  return "default";
}

const PaletteList = memo(function PaletteList({
  items,
}: {
  readonly items: readonly CatalogItem[];
}): JSX.Element {
  return (
    <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <li key={item.id}>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/agx-automation-node", JSON.stringify(item));
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="cursor-grab rounded-xl border px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_35%,transparent)] active:cursor-grabbing"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {item.label}
              </p>
              <Badge tone={kindTone(item.kind)}>{item.kind.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {item.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
});

/**
 * Visual node-based workflow builder — snap grid, smooth zoom/pan, hover states.
 */
export function WorkflowBuilder({
  initial,
  onWorkflowChange,
}: {
  readonly initial: WorkflowDefinition;
  readonly onWorkflowChange?: (workflow: WorkflowDefinition) => void;
}): JSX.Element {
  const t = useT();
  const [workflow, setWorkflow] = useState(() => cloneWorkflow(initial));
  const [past, setPast] = useState<WorkflowDefinition[]>([]);
  const [future, setFuture] = useState<WorkflowDefinition[]>([]);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragMode>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("saved");
  const [paletteTab, setPaletteTab] = useState<"elements" | "triggers" | "actions" | "ai">(
    "elements",
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragSnapshot = useRef<WorkflowDefinition | null>(null);
  const panRaf = useRef<number | null>(null);
  const pendingPan = useRef(pan);

  useEffect(() => {
    onWorkflowChange?.(workflow);
  }, [workflow, onWorkflowChange]);

  const commit = useCallback(
    (next: WorkflowDefinition) => {
      setPast((p) => [...p.slice(-39), workflow]);
      setFuture([]);
      setWorkflow(next);
      setSaveState("saving");
    },
    [workflow],
  );

  useEffect(() => {
    if (saveState !== "saving") return;
    const t = window.setTimeout(() => setSaveState("saved"), 650);
    return () => window.clearTimeout(t);
  }, [saveState, workflow]);

  const undo = useCallback((): void => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [workflow, ...f]);
    setWorkflow(prev);
    setSaveState("saving");
  }, [past, workflow]);

  const redo = useCallback((): void => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, workflow]);
    setWorkflow(next);
    setSaveState("saving");
  }, [future, workflow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const paletteItems = useMemo(() => {
    switch (paletteTab) {
      case "triggers":
        return AVAILABLE_TRIGGERS;
      case "actions":
        return AVAILABLE_ACTIONS;
      case "ai":
        return AI_ACTIONS;
      default:
        return WORKFLOW_ELEMENTS;
    }
  }, [paletteTab]);

  const onPaletteDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/agx-automation-node");
    if (!raw || !viewportRef.current) return;
    const item = JSON.parse(raw) as CatalogItem;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / scale - NODE_W / 2;
    const y = (event.clientY - rect.top - pan.y) / scale - NODE_H / 2;
    const node: WorkflowNode = {
      id: createNodeId(),
      type: item.kind,
      catalogId: item.id,
      label: item.label,
      x,
      y,
    };
    commit(addNode(workflow, node));
    setSelectedId(node.id);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag) return;
    if (drag.kind === "pan") {
      pendingPan.current = { x: event.clientX - drag.ox, y: event.clientY - drag.oy };
      if (panRaf.current == null) {
        panRaf.current = window.requestAnimationFrame(() => {
          setPan(pendingPan.current);
          panRaf.current = null;
        });
      }
      return;
    }
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / scale - drag.ox;
    const y = (event.clientY - rect.top - pan.y) / scale - drag.oy;
    setWorkflow((w) => moveNode(w, drag.id, x, y, true));
  };

  const endDrag = (): void => {
    if (drag?.kind === "node" && dragSnapshot.current) {
      setPast((p) => [...p.slice(-39), dragSnapshot.current!]);
      setFuture([]);
      setSaveState("saving");
      dragSnapshot.current = null;
    }
    setDrag(null);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.06 : 0.06;
    setScale((s) => Math.min(1.8, Math.max(0.45, Number((s + delta).toFixed(2)))));
  };

  const nodeMap = useMemo(() => {
    const map = new Map<string, WorkflowNode>();
    for (const n of workflow.nodes) map.set(n.id, n);
    return map;
  }, [workflow.nodes]);

  const bounds = useMemo(() => {
    if (workflow.nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 240 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of workflow.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    }
    return { minX, minY, maxX, maxY };
  }, [workflow.nodes]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-3 space-y-3" padding="16px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("automation.workflowBuilder.elementsTitle")}
        </h3>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("automation.workflowBuilder.paletteAria")}>
          {(
            [
              ["elements", t("automation.workflowBuilder.tabElements")],
              ["triggers", t("automation.workflowBuilder.tabTriggers")],
              ["actions", t("automation.workflowBuilder.tabActions")],
              ["ai", t("automation.workflowBuilder.tabAiActions")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={paletteTab === id}
              onClick={() => setPaletteTab(id)}
              className="rounded-full border px-2.5 py-1 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                outlineColor: "var(--agx-accent, #22d3ee)",
                borderColor:
                  paletteTab === id
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.1))",
                background:
                  paletteTab === id
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                    : "transparent",
                color:
                  paletteTab === id
                    ? "var(--agx-accent, #22d3ee)"
                    : "var(--agx-text-muted, #94a3b8)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <PaletteList items={paletteItems} />
      </Card>

      <Card className="xl:col-span-9 space-y-3" padding="16px" hover={false}>
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-transparent px-1 pb-1">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("automation.workflowBuilder.builderTitle", { name: workflow.name })}
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("automation.workflowBuilder.builderHint", { grid: GRID_SIZE })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={saveState === "saved" ? "positive" : "accent"}>
              {saveState === "saved" ? t("automation.workflowBuilder.autoSaved") : t("automation.workflowBuilder.saving")}
            </Badge>
            <Button size="sm" variant="ghost" onClick={undo} disabled={past.length === 0}>
              {t("automation.workflowBuilder.undo")}
            </Button>
            <Button size="sm" variant="ghost" onClick={redo} disabled={future.length === 0}>
              {t("automation.workflowBuilder.redo")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setScale((s) => Math.max(0.45, Number((s - 0.1).toFixed(2))))}>
              {t("automation.workflowBuilder.zoomOut")}
            </Button>
            <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {Math.round(scale * 100)}%
            </span>
            <Button size="sm" variant="secondary" onClick={() => setScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(2))))}>
              {t("automation.workflowBuilder.zoomIn")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setScale(1);
                setPan({ x: 40, y: 40 });
              }}
            >
              {t("automation.workflowBuilder.resetView")}
            </Button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative h-[520px] overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
            backgroundColor: "rgba(8,12,20,0.35)",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            touchAction: "none",
            transition: drag?.kind === "pan" ? undefined : "background-size 120ms ease",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onPaletteDrop}
          onWheel={onWheel}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).dataset.canvas === "true") {
              setDrag({ kind: "pan", ox: e.clientX - pan.x, oy: e.clientY - pan.y });
              setSelectedId(null);
              setLinkFrom(null);
            }
          }}
        >
          <div data-canvas="true" className="absolute inset-0" />

          {workflow.nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="pointer-events-auto max-w-md">
                <EmptyState
                  title={t("automation.workflowBuilder.emptyTitle")}
                  description={t("automation.workflowBuilder.emptyDescription")}
                />
              </div>
            </div>
          ) : null}

          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
              transformOrigin: "0 0",
              width: 1400,
              height: 900,
              willChange: "transform",
              transition: drag ? undefined : "transform 120ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <svg className="absolute inset-0" width={1400} height={900} aria-hidden="true">
              {workflow.edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const x1 = from.x + NODE_W;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x;
                const y2 = to.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                const hovered = hoverEdgeId === edge.id;
                return (
                  <path
                    key={edge.id}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={
                      hovered
                        ? "var(--agx-accent, #22d3ee)"
                        : "color-mix(in srgb, var(--agx-accent, #22d3ee) 55%, transparent)"
                    }
                    strokeWidth={hovered ? 3.25 : 2}
                    style={{ cursor: "pointer", transition: "stroke 140ms ease, stroke-width 140ms ease" }}
                    onMouseEnter={() => setHoverEdgeId(edge.id)}
                    onMouseLeave={() => setHoverEdgeId(null)}
                  />
                );
              })}
            </svg>

            {workflow.nodes.map((node) => {
              const active = selectedId === node.id;
              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragSnapshot.current = cloneWorkflow(workflow);
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setDrag({
                      kind: "node",
                      id: node.id,
                      ox: (e.clientX - rect.left) / scale,
                      oy: (e.clientY - rect.top) / scale,
                    });
                    setSelectedId(node.id);
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (linkFrom && linkFrom !== node.id) {
                      commit(connectNodes(workflow, linkFrom, node.id));
                      setLinkFrom(null);
                    } else {
                      setLinkFrom(node.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(node.id);
                    }
                  }}
                  className="absolute select-none rounded-2xl border px-3 py-2 shadow-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    minHeight: NODE_H,
                    outlineColor: "var(--agx-accent, #22d3ee)",
                    borderColor: active
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 65%, transparent)"
                      : "var(--agx-card-border, rgba(255,255,255,0.14))",
                    background: active
                      ? "linear-gradient(165deg, rgba(34,211,238,0.16), rgba(255,255,255,0.03))"
                      : "linear-gradient(165deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                    boxShadow: active
                      ? "0 0 0 1px color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent), 0 12px 28px rgba(0,0,0,0.28)"
                      : "0 8px 20px rgba(0,0,0,0.22)",
                    backdropFilter: "blur(12px)",
                    cursor: "grab",
                  }}
                >
                  <Badge tone={kindTone(node.type)}>{node.type.replaceAll("_", " ")}</Badge>
                  <p
                    className="mt-2 text-sm font-medium leading-snug"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {node.label}
                  </p>
                  {linkFrom === node.id ? (
                    <p className="mt-1 text-[10px]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                      {t("automation.workflowBuilder.connectHint")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className="absolute bottom-3 right-3 overflow-hidden rounded-xl border"
            style={{
              width: 140,
              height: 96,
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.14))",
              background: "rgba(8,12,20,0.72)",
            }}
            aria-label={t("automation.workflowBuilder.miniMapAria")}
          >
            <svg
              width={140}
              height={96}
              viewBox={`${bounds.minX - 40} ${bounds.minY - 40} ${Math.max(200, bounds.maxX - bounds.minX + 80)} ${Math.max(140, bounds.maxY - bounds.minY + 80)}`}
            >
              {workflow.edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={edge.id}
                    x1={from.x + NODE_W / 2}
                    y1={from.y + NODE_H / 2}
                    x2={to.x + NODE_W / 2}
                    y2={to.y + NODE_H / 2}
                    stroke="rgba(34,211,238,0.45)"
                    strokeWidth={8}
                  />
                );
              })}
              {workflow.nodes.map((n) => (
                <rect
                  key={n.id}
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={selectedId === n.id ? "rgba(34,211,238,0.55)" : "rgba(34,211,238,0.35)"}
                />
              ))}
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
}
