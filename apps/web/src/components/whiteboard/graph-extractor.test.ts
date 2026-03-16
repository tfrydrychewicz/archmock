import { describe, it, expect } from "vitest";
import { extractDiagramGraph } from "./graph-extractor";

function createMockEditor(shapes: Array<{
  id: string;
  type: string;
  x: number;
  y: number;
  parentId: string;
  props: Record<string, unknown>;
}>, bindings: Array<{ shapeId: string; terminal: "start" | "end"; toId: string }>) {
  return {
    getCurrentPageShapes: () => shapes,
    getBindingsFromShape: (shape: { id: string }, _bindingType: string) =>
      bindings
        .filter((b) => b.shapeId === shape.id)
        .map((b) => ({
          props: { terminal: b.terminal },
          toId: b.toId,
        })),
  } as unknown as Parameters<typeof extractDiagramGraph>[0];
}

describe("extractDiagramGraph", () => {
  it("returns empty graph for empty canvas", () => {
    const editor = createMockEditor([], []);
    const graph = extractDiagramGraph(editor);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.zones).toEqual([]);
    expect(graph.metadata?.nodeCount).toBe(0);
    expect(graph.metadata?.edgeCount).toBe(0);
  });

  it("extracts nodes from sd- shapes", () => {
    const shapes = [
      {
        id: "shape:svc1",
        type: "sd-service",
        x: 100,
        y: 50,
        parentId: "page:main",
        props: { w: 200, h: 80, label: "API", subLabel: "Node.js", techChoice: "" },
      },
      {
        id: "shape:db1",
        type: "sd-database",
        x: 100,
        y: 200,
        parentId: "page:main",
        props: { w: 180, h: 90, label: "PostgreSQL", subLabel: "SQL", techChoice: "" },
      },
    ];
    const editor = createMockEditor(shapes, []);
    const graph = extractDiagramGraph(editor);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]).toMatchObject({
      id: "shape:svc1",
      type: "sd-service",
      label: "API",
      subLabel: "Node.js",
      position: { x: 100, y: 50 },
    });
    expect(graph.nodes[1]).toMatchObject({
      id: "shape:db1",
      type: "sd-database",
      label: "PostgreSQL",
      subLabel: "SQL",
    });
    expect(graph.metadata?.nodeCount).toBe(2);
  });

  it("excludes sd-zone from nodes", () => {
    const shapes = [
      {
        id: "shape:zone1",
        type: "sd-zone",
        x: 0,
        y: 0,
        parentId: "page:main",
        props: { w: 400, h: 300, label: "VPC" },
      },
    ];
    const editor = createMockEditor(shapes, []);
    const graph = extractDiagramGraph(editor);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.zones).toHaveLength(1);
    expect(graph.zones[0]).toMatchObject({ id: "shape:zone1", label: "VPC" });
  });

  it("extracts edges from arrows with bindings", () => {
    const shapes = [
      {
        id: "shape:svc1",
        type: "sd-service",
        x: 100,
        y: 50,
        parentId: "page:main",
        props: { w: 200, h: 80, label: "API", subLabel: "", techChoice: "" },
      },
      {
        id: "shape:db1",
        type: "sd-database",
        x: 100,
        y: 200,
        parentId: "page:main",
        props: { w: 180, h: 90, label: "DB", subLabel: "", techChoice: "" },
      },
      {
        id: "shape:arrow1",
        type: "arrow",
        x: 0,
        y: 0,
        parentId: "page:main",
        props: { text: "REST" },
      },
    ];
    const bindings = [
      { shapeId: "shape:arrow1", terminal: "start" as const, toId: "shape:svc1" },
      { shapeId: "shape:arrow1", terminal: "end" as const, toId: "shape:db1" },
    ];
    const editor = createMockEditor(shapes, bindings);
    const graph = extractDiagramGraph(editor);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      id: "shape:arrow1",
      from: "shape:svc1",
      to: "shape:db1",
      label: "REST",
      protocol: "http",
      isAsync: false,
    });
  });

  it("infers isAsync from label containing async/kafka/queue", () => {
    const shapes = [
      {
        id: "shape:svc1",
        type: "sd-service",
        x: 100,
        y: 50,
        parentId: "page:main",
        props: { w: 200, h: 80, label: "Producer", subLabel: "", techChoice: "" },
      },
      {
        id: "shape:q1",
        type: "sd-queue",
        x: 100,
        y: 200,
        parentId: "page:main",
        props: { w: 180, h: 70, label: "Kafka", subLabel: "", techChoice: "" },
      },
      {
        id: "shape:arrow1",
        type: "arrow",
        x: 0,
        y: 0,
        parentId: "page:main",
        props: { text: "async events" },
      },
    ];
    const bindings = [
      { shapeId: "shape:arrow1", terminal: "start" as const, toId: "shape:svc1" },
      { shapeId: "shape:arrow1", terminal: "end" as const, toId: "shape:q1" },
    ];
    const editor = createMockEditor(shapes, bindings);
    const graph = extractDiagramGraph(editor);
    expect(graph.edges[0].isAsync).toBe(true);
    expect(graph.edges[0].protocol).toBe("async");
    expect(graph.metadata?.hasAsyncProcessing).toBe(true);
  });

  it("assigns zone to nodes inside sd-zone", () => {
    const shapes = [
      {
        id: "shape:zone1",
        type: "sd-zone",
        x: 0,
        y: 0,
        parentId: "page:main",
        props: { w: 400, h: 300, label: "Backend" },
      },
      {
        id: "shape:svc1",
        type: "sd-service",
        x: 50,
        y: 50,
        parentId: "shape:zone1",
        props: { w: 200, h: 80, label: "API", subLabel: "", techChoice: "" },
      },
    ];
    const editor = createMockEditor(shapes, []);
    const graph = extractDiagramGraph(editor);
    expect(graph.nodes[0].zone).toBe("shape:zone1");
    expect(graph.zones[0].childNodeIds).toContain("shape:svc1");
  });

  it("detects hasRedundancy when multiple services or LB present", () => {
    const shapes = [
      {
        id: "shape:svc1",
        type: "sd-service",
        x: 50,
        y: 50,
        parentId: "page:main",
        props: { w: 200, h: 80, label: "API 1", subLabel: "", techChoice: "" },
      },
      {
        id: "shape:svc2",
        type: "sd-service",
        x: 300,
        y: 50,
        parentId: "page:main",
        props: { w: 200, h: 80, label: "API 2", subLabel: "", techChoice: "" },
      },
    ];
    const editor = createMockEditor(shapes, []);
    const graph = extractDiagramGraph(editor);
    expect(graph.metadata?.hasRedundancy).toBe(true);
  });

  it("detects hasCaching when sd-cache present", () => {
    const shapes = [
      {
        id: "shape:cache1",
        type: "sd-cache",
        x: 100,
        y: 100,
        parentId: "page:main",
        props: { w: 180, h: 70, label: "Redis", subLabel: "", techChoice: "" },
      },
    ];
    const editor = createMockEditor(shapes, []);
    const graph = extractDiagramGraph(editor);
    expect(graph.metadata?.hasCaching).toBe(true);
  });

  it("skips arrows without both bindings", () => {
    const shapes = [
      {
        id: "shape:arrow1",
        type: "arrow",
        x: 0,
        y: 0,
        parentId: "page:main",
        props: {},
      },
    ];
    const bindings = [{ shapeId: "shape:arrow1", terminal: "start" as const, toId: "shape:svc1" }];
    const editor = createMockEditor(shapes, bindings);
    const graph = extractDiagramGraph(editor);
    expect(graph.edges).toHaveLength(0);
  });
});
