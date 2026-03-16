import type { DiagramGraph } from "@archmock/shared";

export function runStaticAnalysis(graph: DiagramGraph): string[] {
  const issues: string[] = [];

  const dbNodes = graph.nodes.filter((n) => n.type === "sd-database");
  for (const db of dbNodes) {
    const incomingEdges = graph.edges.filter((e) => e.to === db.id);
    if (incomingEdges.length > 2) {
      const hasCache = graph.nodes.some(
        (n) =>
          n.type === "sd-cache" &&
          graph.edges.some((e) => e.from === n.id && e.to === db.id)
      );
      if (!hasCache) {
        issues.push(
          `Database "${db.label}" has ${incomingEdges.length} direct connections with no cache layer`
        );
      }
    }
  }

  const services = graph.nodes.filter((n) => n.type === "sd-service");
  const hasLB = graph.nodes.some((n) => n.type === "sd-load-balancer");
  if (services.length > 2 && !hasLB) {
    issues.push("Multiple services but no load balancer");
  }

  const hasAsync = graph.edges.some((e) => e.isAsync);
  const hasQueue = graph.nodes.some((n) => n.type === "sd-queue");
  if (graph.edges.length > 4 && !hasAsync && !hasQueue) {
    issues.push("All connections appear synchronous — no async processing");
  }

  const connectedNodeIds = new Set([
    ...graph.edges.map((e) => e.from),
    ...graph.edges.map((e) => e.to),
  ]);
  const disconnected = graph.nodes.filter(
    (n) => n.type !== "sd-zone" && !connectedNodeIds.has(n.id)
  );
  if (disconnected.length > 0) {
    issues.push(
      `Disconnected components: ${disconnected.map((n) => n.label).join(", ")}`
    );
  }

  return issues;
}
