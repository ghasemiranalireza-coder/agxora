import type { WorkflowDefinition } from "./types";

export const GRID_SIZE = 24;

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

export function cloneWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  return {
    ...workflow,
    nodes: workflow.nodes.map((n) => ({ ...n })),
    edges: workflow.edges.map((e) => ({ ...e })),
  };
}

export function moveNode(
  workflow: WorkflowDefinition,
  nodeId: string,
  x: number,
  y: number,
  snap = true,
): WorkflowDefinition {
  const nx = snap ? snapToGrid(x) : x;
  const ny = snap ? snapToGrid(y) : y;
  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.id === nodeId ? { ...node, x: nx, y: ny } : node,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function addNode(
  workflow: WorkflowDefinition,
  node: WorkflowDefinition["nodes"][number],
): WorkflowDefinition {
  return {
    ...workflow,
    nodes: [
      ...workflow.nodes,
      {
        ...node,
        x: snapToGrid(node.x),
        y: snapToGrid(node.y),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function connectNodes(
  workflow: WorkflowDefinition,
  from: string,
  to: string,
): WorkflowDefinition {
  if (from === to) return workflow;
  if (workflow.edges.some((e) => e.from === from && e.to === to)) return workflow;
  return {
    ...workflow,
    edges: [
      ...workflow.edges,
      { id: `e-${from}-${to}-${Date.now()}`, from, to },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function createNodeId(): string {
  return `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
