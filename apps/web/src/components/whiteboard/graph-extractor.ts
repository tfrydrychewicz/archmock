"use client";

import type { Editor } from "tldraw";
import type {
  DiagramGraph,
  DiagramEdge,
  DiagramNode,
  DiagramZone,
  SDProtocol,
} from "@archmock/shared";

function findParentZone(
  shape: { id: string; parentId: string },
  allShapes: { id: string; type: string; parentId: string }[]
): { id: string } | undefined {
  let current = allShapes.find((s) => s.id === shape.parentId);
  while (current) {
    if (current.type === "sd-zone") return { id: current.id };
    current = allShapes.find((s) => s.id === current!.parentId);
  }
  return undefined;
}

function inferProtocol(text: string | undefined): SDProtocol | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes("grpc")) return "grpc";
  if (lower.includes("websocket") || lower.includes("ws")) return "websocket";
  if (lower.includes("async") || lower.includes("kafka") || lower.includes("queue"))
    return "async";
  if (lower.includes("http") || lower.includes("rest")) return "http";
  if (lower.includes("tcp")) return "tcp";
  return "custom";
}

function inferAsync(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("async") ||
    lower.includes("kafka") ||
    lower.includes("queue") ||
    lower.includes("event")
  );
}

function checkRedundancy(
  nodes: DiagramNode[],
  edges: DiagramEdge[]
): boolean {
  const hasMultipleServices =
    nodes.filter((n) => n.type === "sd-service").length > 1;
  const hasLB = nodes.some((n) => n.type === "sd-load-balancer");
  const hasReplicas = nodes.some(
    (n) => n.label?.toLowerCase().includes("replica") ?? false
  );
  return hasMultipleServices || hasLB || hasReplicas;
}

export function extractDiagramGraph(editor: Editor): DiagramGraph {
  const allShapes = editor.getCurrentPageShapes();

  const nodes: DiagramNode[] = allShapes
    .filter(
      (s) =>
        typeof s.type === "string" &&
        s.type.startsWith("sd-") &&
        s.type !== "sd-zone"
    )
    .map((s) => {
      const props = s.props as Record<string, unknown>;
      const parentZone = findParentZone(s, allShapes);
      return {
        id: s.id,
        type: s.type as DiagramNode["type"],
        label: (props?.label as string) ?? "",
        subLabel: props?.subLabel as string | undefined,
        techChoice: props?.techChoice as string | undefined,
        position: { x: s.x, y: s.y },
        zone: parentZone?.id,
        metrics: props?.metrics as DiagramNode["metrics"],
      };
    });

  const arrowShapes = allShapes.filter((s) => s.type === "arrow");
  const edges: DiagramEdge[] = [];

  for (const arrow of arrowShapes) {
    const bindings = editor.getBindingsFromShape(arrow, "arrow");
    const startBinding = bindings.find(
      (b: { props: { terminal?: string } }) => b.props?.terminal === "start"
    );
    const endBinding = bindings.find(
      (b: { props: { terminal?: string } }) => b.props?.terminal === "end"
    );
    const fromId = startBinding?.toId ?? "";
    const toId = endBinding?.toId ?? "";
    if (fromId && toId) {
      const props = arrow.props as Record<string, unknown>;
      const label = props?.text as string | undefined;
      edges.push({
        id: arrow.id,
        from: fromId,
        to: toId,
        label,
        protocol: inferProtocol(label),
        isAsync: inferAsync(label),
      });
    }
  }

  const zones: DiagramZone[] = allShapes
    .filter((s) => s.type === "sd-zone")
    .map((z) => {
      const props = z.props as Record<string, unknown>;
      return {
        id: z.id,
        label: (props?.label as string) ?? "",
        childNodeIds: nodes.filter((n) => n.zone === z.id).map((n) => n.id),
      };
    });

  const metadata = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasRedundancy: checkRedundancy(nodes, edges),
    hasCaching: nodes.some((n) => n.type === "sd-cache"),
    hasAsyncProcessing:
      edges.some((e) => e.isAsync) ||
      nodes.some((n) => n.type === "sd-queue"),
    hasLoadBalancing: nodes.some((n) => n.type === "sd-load-balancer"),
  };

  return { nodes, edges, zones, metadata };
}
