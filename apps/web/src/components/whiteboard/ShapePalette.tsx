"use client";

import { useMemo, useState } from "react";
import { useEditor, toRichText } from "tldraw";
import type { SDShapeType } from "@archmock/shared";

type ShapePreset = {
  type: SDShapeType;
  label: string;
  icon: string;
  category: string;
  keywords: string;
};

const SHAPE_PRESETS: ShapePreset[] = [
  // Services & compute
  { type: "sd-service", label: "Service", icon: "⚙️", category: "Compute", keywords: "service api microservice" },
  { type: "sd-service", label: "API", icon: "🔌", category: "Compute", keywords: "api rest graphql" },
  { type: "sd-service", label: "Microservice", icon: "🔷", category: "Compute", keywords: "microservice" },
  { type: "sd-service", label: "Web Server", icon: "🌐", category: "Compute", keywords: "web server nginx" },
  { type: "sd-service", label: "App Server", icon: "🖥️", category: "Compute", keywords: "app server application" },
  { type: "sd-service", label: "Worker", icon: "👷", category: "Compute", keywords: "worker background job" },
  { type: "sd-service", label: "Serverless", icon: "☁️", category: "Compute", keywords: "serverless lambda function" },
  { type: "sd-service", label: "External API", icon: "🔗", category: "Compute", keywords: "external third party api" },
  // Databases
  { type: "sd-database", label: "Database", icon: "🗄️", category: "Data", keywords: "database db" },
  { type: "sd-database", label: "SQL Database", icon: "📊", category: "Data", keywords: "sql postgres mysql" },
  { type: "sd-database", label: "NoSQL Database", icon: "📋", category: "Data", keywords: "nosql mongodb dynamodb" },
  { type: "sd-database", label: "Graph Database", icon: "🕸️", category: "Data", keywords: "graph neo4j" },
  { type: "sd-database", label: "Search Index", icon: "🔍", category: "Data", keywords: "search elasticsearch" },
  { type: "sd-database", label: "Time Series DB", icon: "📈", category: "Data", keywords: "timeseries influx" },
  // Cache
  { type: "sd-cache", label: "Cache", icon: "⚡", category: "Data", keywords: "cache" },
  { type: "sd-cache", label: "Redis", icon: "🔴", category: "Data", keywords: "redis" },
  { type: "sd-cache", label: "Memcached", icon: "💾", category: "Data", keywords: "memcached" },
  // Queue & messaging
  { type: "sd-queue", label: "Queue", icon: "📨", category: "Messaging", keywords: "queue" },
  { type: "sd-queue", label: "Message Broker", icon: "📬", category: "Messaging", keywords: "broker messaging" },
  { type: "sd-queue", label: "Kafka", icon: "📡", category: "Messaging", keywords: "kafka" },
  { type: "sd-queue", label: "SQS", icon: "📮", category: "Messaging", keywords: "sqs" },
  { type: "sd-queue", label: "RabbitMQ", icon: "🐰", category: "Messaging", keywords: "rabbitmq" },
  { type: "sd-queue", label: "Event Bus", icon: "🚌", category: "Messaging", keywords: "event bus" },
  // Load balancing & routing
  { type: "sd-load-balancer", label: "Load Balancer", icon: "⚖️", category: "Network", keywords: "load balancer lb" },
  { type: "sd-load-balancer", label: "API Gateway", icon: "🚪", category: "Network", keywords: "api gateway" },
  { type: "sd-load-balancer", label: "Reverse Proxy", icon: "🔄", category: "Network", keywords: "proxy nginx" },
  // CDN & edge
  { type: "sd-cdn", label: "CDN", icon: "🌐", category: "Network", keywords: "cdn edge" },
  { type: "sd-cdn", label: "Edge Node", icon: "📍", category: "Network", keywords: "edge" },
  // Clients
  { type: "sd-client", label: "Client", icon: "📱", category: "Client", keywords: "client" },
  { type: "sd-client", label: "Browser", icon: "🌐", category: "Client", keywords: "browser web" },
  { type: "sd-client", label: "Mobile App", icon: "📱", category: "Client", keywords: "mobile app" },
  { type: "sd-client", label: "IoT Device", icon: "📟", category: "Client", keywords: "iot device" },
  { type: "sd-client", label: "Desktop App", icon: "💻", category: "Client", keywords: "desktop" },
  // Storage
  { type: "sd-storage", label: "Storage", icon: "📦", category: "Storage", keywords: "storage" },
  { type: "sd-storage", label: "Object Storage", icon: "🪣", category: "Storage", keywords: "object s3 blob" },
  { type: "sd-storage", label: "File Storage", icon: "📁", category: "Storage", keywords: "file storage" },
  { type: "sd-storage", label: "S3", icon: "☁️", category: "Storage", keywords: "s3 aws" },
  { type: "sd-storage", label: "Blob Storage", icon: "📦", category: "Storage", keywords: "blob azure" },
  // Zones
  { type: "sd-zone", label: "Zone", icon: "▢", category: "Grouping", keywords: "zone" },
  { type: "sd-zone", label: "VPC", icon: "🔒", category: "Grouping", keywords: "vpc network" },
  { type: "sd-zone", label: "Region", icon: "🌍", category: "Grouping", keywords: "region" },
  { type: "sd-zone", label: "Availability Zone", icon: "📍", category: "Grouping", keywords: "az availability" },
  { type: "sd-zone", label: "Data Center", icon: "🏢", category: "Grouping", keywords: "datacenter dc" },
];

export function ShapePalette() {
  const editor = useEditor();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SHAPE_PRESETS;
    return SHAPE_PRESETS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q)
    );
  }, [search]);

  const handleAddShape = (preset: ShapePreset) => {
    const viewportBounds = editor.getViewportPageBounds();
    const viewportCenter = {
      x: viewportBounds.x + viewportBounds.w / 2,
      y: viewportBounds.y + viewportBounds.h / 2,
    };
    editor.createShape({
      type: preset.type,
      x: viewportCenter.x - 100,
      y: viewportCenter.y - 40,
      props:
        preset.type === "sd-zone"
          ? { w: 400, h: 300, label: preset.label }
          : {
              w: preset.type === "sd-load-balancer" ? 140 : 180,
              h: 70,
              label: preset.label,
              subLabel: "",
              techChoice: "",
            },
    });
  };

  const handleAddNote = () => {
    const viewportBounds = editor.getViewportPageBounds();
    const viewportCenter = {
      x: viewportBounds.x + viewportBounds.w / 2,
      y: viewportBounds.y + viewportBounds.h / 2,
    };
    editor.createShape({
      type: "note",
      x: viewportCenter.x - 100,
      y: viewportCenter.y - 100,
      props: {
        richText: toRichText("Requirements\n• Functional\n• Non-functional"),
        color: "yellow",
        size: "m",
      },
    });
  };

  return (
    <div className="flex flex-col w-52 max-h-[70vh] bg-muted/80 dark:bg-muted rounded-lg border border-border shadow-lg">
      <div className="flex shrink-0 flex-col gap-2 p-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground px-1">Add shape</span>
        <input
          type="search"
          placeholder="Search shapes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No shapes match &quot;{search}&quot;</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((preset) => (
              <button
                key={`${preset.type}-${preset.label}`}
                type="button"
                onClick={() => handleAddShape(preset)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-left text-sm transition-colors"
                title={`Add ${preset.label}`}
              >
                <span className="text-lg shrink-0">{preset.icon}</span>
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={handleAddNote}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted text-left text-sm transition-colors"
          title="Add note (tldraw built-in)"
        >
          <span className="text-lg">📝</span>
          <span>Note</span>
        </button>
      </div>
    </div>
  );
}
