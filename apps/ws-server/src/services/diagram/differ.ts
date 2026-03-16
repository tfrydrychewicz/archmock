import type { DiagramGraph } from "@archmock/shared";

export function computeChanges(
  current: DiagramGraph,
  previous: DiagramGraph | null
): string[] {
  if (!previous) return ["Initial diagram created"];

  const changes: string[] = [];
  const prevNodeIds = new Set(previous.nodes.map((n) => n.id));
  const currNodeIds = new Set(current.nodes.map((n) => n.id));

  for (const node of current.nodes) {
    if (!prevNodeIds.has(node.id)) {
      changes.push(`Added ${node.type}: "${node.label}"`);
    }
  }

  for (const node of previous.nodes) {
    if (!currNodeIds.has(node.id)) {
      changes.push(`Removed ${node.type}: "${node.label}"`);
    }
  }

  const prevEdgeKeys = new Set(
    previous.edges.map((e) => `${e.from}->${e.to}`)
  );
  for (const edge of current.edges) {
    if (!prevEdgeKeys.has(`${edge.from}->${edge.to}`)) {
      const fromNode = current.nodes.find((n) => n.id === edge.from);
      const toNode = current.nodes.find((n) => n.id === edge.to);
      changes.push(
        `Connected "${fromNode?.label ?? "?"}" → "${toNode?.label ?? "?"}"${edge.label ? ` (${edge.label})` : ""}`
      );
    }
  }

  return changes;
}
