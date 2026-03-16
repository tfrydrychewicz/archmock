"use client";

import { useEditor, toRichText } from "tldraw";
import type { SDShapeType } from "@archmock/shared";

const SHAPES: { type: SDShapeType; label: string; icon: string }[] = [
  { type: "sd-service", label: "Service", icon: "⚙️" },
  { type: "sd-database", label: "Database", icon: "🗄️" },
  { type: "sd-cache", label: "Cache", icon: "⚡" },
  { type: "sd-queue", label: "Queue", icon: "📨" },
  { type: "sd-load-balancer", label: "Load Balancer", icon: "⚖️" },
  { type: "sd-cdn", label: "CDN", icon: "🌐" },
  { type: "sd-client", label: "Client", icon: "📱" },
  { type: "sd-storage", label: "Storage", icon: "📦" },
  { type: "sd-zone", label: "Zone", icon: "▢" },
];

export function ShapePalette() {
  const editor = useEditor();

  const handleAddShape = (type: SDShapeType) => {
    const viewportBounds = editor.getViewportPageBounds();
    const viewportCenter = { x: viewportBounds.x + viewportBounds.w / 2, y: viewportBounds.y + viewportBounds.h / 2 };
    editor.createShape({
      type,
      x: viewportCenter.x - 100,
      y: viewportCenter.y - 40,
      props:
        type === "sd-zone"
          ? { w: 400, h: 300, label: "Zone" }
          : {
              w: type === "sd-load-balancer" ? 140 : 180,
              h: 70,
              label: SHAPES.find((s) => s.type === type)?.label ?? type,
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
    <div className="flex flex-col gap-1 p-2 bg-slate-800/50 rounded-lg border border-slate-600">
      <span className="text-xs font-medium text-slate-400 mb-1 px-2">
        Add shape
      </span>
      {SHAPES.map(({ type, label, icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => handleAddShape(type)}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700/50 text-left text-sm text-slate-200 transition-colors"
          title={`Add ${label}`}
        >
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={handleAddNote}
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700/50 text-left text-sm text-slate-200 transition-colors mt-1 border-t border-slate-600 pt-2"
        title="Add note (tldraw built-in)"
      >
        <span className="text-lg">📝</span>
        <span>Note</span>
      </button>
    </div>
  );
}
