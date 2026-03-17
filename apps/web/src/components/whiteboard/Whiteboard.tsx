"use client";

import { useRef } from "react";
import { Tldraw, defaultShapeUtils } from "tldraw";
import "./shape-types";
import "tldraw/tldraw.css";
import { extractDiagramGraph } from "./graph-extractor";
import { ShapePalette } from "./ShapePalette";
import { ShapePropertiesPanel } from "./ShapePropertiesPanel";
import { TldrawThemeSync } from "./TldrawThemeSync";
import {
  SDServiceShapeUtil,
  SDDatabaseShapeUtil,
  SDCacheShapeUtil,
  SDQueueShapeUtil,
  SDLoadBalancerShapeUtil,
  SDClientShapeUtil,
  SDCdnShapeUtil,
  SDStorageShapeUtil,
  SDZoneShapeUtil,
} from "./shapes";

const SHAPE_UTILS = [
  SDServiceShapeUtil,
  SDDatabaseShapeUtil,
  SDCacheShapeUtil,
  SDQueueShapeUtil,
  SDLoadBalancerShapeUtil,
  SDClientShapeUtil,
  SDCdnShapeUtil,
  SDStorageShapeUtil,
  SDZoneShapeUtil,
];

export function Whiteboard() {
  const lastLogRef = useRef<string>("");

  return (
    <div className="fixed inset-0 flex">
      <div className="flex-1 relative">
        <Tldraw
          inferDarkMode
          shapeUtils={[...defaultShapeUtils, ...SHAPE_UTILS]}
          onMount={(editor) => {
            const interval = setInterval(() => {
              const graph = extractDiagramGraph(editor);
              const graphStr = JSON.stringify(graph);
              if (graphStr !== lastLogRef.current) {
                lastLogRef.current = graphStr;
                console.log("[ArchMock] DiagramGraph:", graph);
              }
            }, 1000);
            return () => clearInterval(interval);
          }}
        >
          <TldrawThemeSync />
          <div className="absolute left-4 top-20 z-[300]">
            <ShapePalette />
          </div>
          <ShapePropertiesPanel />
        </Tldraw>
      </div>
    </div>
  );
}
