"use client";

import { useEditor, useValue } from "tldraw";
import type { SDShapeType } from "@archmock/shared";

const SHAPES_WITH_SUBLABEL: SDShapeType[] = [
  "sd-service",
  "sd-database",
  "sd-cache",
  "sd-queue",
  "sd-load-balancer",
  "sd-cdn",
  "sd-client",
  "sd-storage",
];

const MIN_HEIGHT: Record<SDShapeType, number> = {
  "sd-service": 60,
  "sd-database": 70,
  "sd-cache": 50,
  "sd-queue": 50,
  "sd-load-balancer": 60,
  "sd-cdn": 40,
  "sd-client": 40,
  "sd-storage": 50,
  "sd-zone": 150,
};

const LABEL_ICON_HEIGHT = 64;
const LINE_HEIGHT = 22;

export function ShapePropertiesPanel() {
  const editor = useEditor();
  const selectedShape = useValue(
    "selectedShape",
    () => {
      const ids = editor.getSelectedShapeIds();
      if (ids.length !== 1) return null;
      const shape = editor.getShape(ids[0]);
      if (!shape || typeof shape.type !== "string" || !shape.type.startsWith("sd-"))
        return null;
      return shape;
    },
    [editor]
  );

  if (!selectedShape) return null;

  const props = selectedShape.props as Record<string, unknown>;
  const type = selectedShape.type as SDShapeType;
  const hasSubLabel = SHAPES_WITH_SUBLABEL.includes(type);

  const updateProp = (key: string, value: string) => {
    const newProps = { ...props, [key]: value };
    if (key === "subLabel" && hasSubLabel) {
      const trimmed = value.trim();
      const lineCount = trimmed ? (trimmed.match(/\n/g) || []).length + 1 : 0;
      const minH = MIN_HEIGHT[type] ?? 60;
      const contentHeight =
        LABEL_ICON_HEIGHT + (lineCount > 0 ? lineCount * LINE_HEIGHT : 0);
      newProps.h = Math.max(minH, contentHeight);
    }
    editor.updateShape({
      id: selectedShape.id,
      type,
      props: newProps,
    });
  };

  return (
    <div className="absolute right-4 top-20 z-[300] w-56 rounded-lg border border-slate-600 bg-slate-800/95 p-3 shadow-lg backdrop-blur">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        Component
      </span>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Name</label>
          <input
            type="text"
            value={(props?.label as string) ?? ""}
            onChange={(e) => updateProp("label", e.target.value)}
            placeholder="e.g. API, UserService"
            className="w-full rounded border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {hasSubLabel && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Details
            </label>
            <textarea
              rows={3}
              value={(props?.subLabel as string) ?? ""}
              onChange={(e) => updateProp("subLabel", e.target.value)}
              placeholder={
                type === "sd-database"
                  ? "SQL / NoSQL / Graph"
                  : type === "sd-cache"
                    ? "Redis / Memcached"
                    : type === "sd-queue"
                      ? "Kafka / SQS / RabbitMQ"
                      : type === "sd-load-balancer"
                        ? "L4 / L7 / API GW"
                        : type === "sd-storage"
                          ? "S3 / GCS / Blob"
                          : "Tech or details"
              }
              className="w-full resize-y min-h-[4rem] rounded border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
