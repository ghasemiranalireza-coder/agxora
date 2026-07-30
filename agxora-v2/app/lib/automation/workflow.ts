import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from "./types";

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
): WorkflowDefinition {
  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.id === nodeId ? { ...node, x, y } : node,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function addNode(
  workflow: WorkflowDefinition,
  node: WorkflowNode,
): WorkflowDefinition {
  return {
    ...workflow,
    nodes: [...workflow.nodes, node],
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
  const edge: WorkflowEdge = {
    id: `e-${from}-${to}-${Date.now()}`,
    from,
    to,
  };
  return {
    ...workflow,
    edges: [...workflow.edges, edge],
    updatedAt: new Date().toISOString(),
  };
}

export function createNodeId(): string {
  return `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
