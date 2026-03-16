export type SDShapeType =
  | "sd-service"
  | "sd-database"
  | "sd-cache"
  | "sd-queue"
  | "sd-load-balancer"
  | "sd-cdn"
  | "sd-client"
  | "sd-storage"
  | "sd-zone";

export type SDProtocol =
  | "http"
  | "grpc"
  | "websocket"
  | "async"
  | "tcp"
  | "custom";

export interface DiagramNode {
  id: string;
  type: SDShapeType;
  label: string;
  subLabel?: string;
  techChoice?: string;
  position: { x: number; y: number };
  zone?: string;
  annotations?: string[];
  metrics?: {
    rps?: string;
    latency?: string;
    storage?: string;
    throughput?: string;
  };
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  protocol?: SDProtocol;
  isAsync?: boolean;
  dataFlow?: string;
}

export interface DiagramZone {
  id: string;
  label: string;
  childNodeIds: string[];
}

export interface DiagramTextBlock {
  id: string;
  type: "text" | "note";
  content: string;
  position: { x: number; y: number };
}

export interface DiagramGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  zones: DiagramZone[];
  textBlocks?: DiagramTextBlock[];
  metadata?: {
    nodeCount: number;
    edgeCount: number;
    hasRedundancy: boolean;
    hasCaching: boolean;
    hasAsyncProcessing: boolean;
    hasLoadBalancing: boolean;
  };
}
