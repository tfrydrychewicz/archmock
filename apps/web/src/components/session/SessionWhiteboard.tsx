"use client";

import { useLayoutEffect, useMemo, useState, useRef } from "react";
import {
  Tldraw,
  createTLStore,
  getSnapshot,
  loadSnapshot,
  DefaultSpinner,
  defaultShapeUtils,
} from "tldraw";
import "../whiteboard/shape-types";
import "tldraw/tldraw.css";
import { ShapePalette } from "../whiteboard/ShapePalette";
import { ShapePropertiesPanel } from "../whiteboard/ShapePropertiesPanel";
import { DiagramChangeNotifier } from "../whiteboard/DiagramChangeNotifier";
import type { DiagramGraph } from "@archmock/shared";
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
} from "../whiteboard/shapes";

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

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function SessionWhiteboard({
  sessionId,
  initialSnapshot,
  onSave,
  onDiagramChange,
}: {
  sessionId: string;
  initialSnapshot: unknown;
  onSave: (snapshot: unknown) => Promise<void>;
  onDiagramChange?: (graph: DiagramGraph) => void;
}) {
  const store = useMemo(
    () =>
      createTLStore({
        shapeUtils: [...defaultShapeUtils, ...SHAPE_UTILS],
      }),
    []
  );

  const [loadingState, setLoadingState] = useState<
    | { status: "loading" }
    | { status: "ready" }
    | { status: "error"; error: string }
  >({ status: "loading" });

  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useLayoutEffect(() => {
    setLoadingState({ status: "loading" });

    if (initialSnapshot && typeof initialSnapshot === "object") {
      try {
        loadSnapshot(store, initialSnapshot as Parameters<typeof loadSnapshot>[1]);
      } catch (err) {
        console.warn("Failed to load diagram snapshot:", err);
      }
    }

    setLoadingState({ status: "ready" });

    const persist = debounce(() => {
      const snapshot = getSnapshot(store);
      saveRef.current(snapshot).catch(console.error);
    }, 2000);

    const cleanup = store.listen(persist);
    return () => cleanup();
  }, [store, sessionId]);

  if (loadingState.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <DefaultSpinner />
      </div>
    );
  }

  if (loadingState.status === "error") {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        {loadingState.error}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Tldraw store={store} shapeUtils={[...defaultShapeUtils, ...SHAPE_UTILS]}>
        {onDiagramChange && <DiagramChangeNotifier onDiagramChange={onDiagramChange} />}
        <div className="absolute left-4 top-20 z-[300]">
          <ShapePalette />
        </div>
        <ShapePropertiesPanel />
      </Tldraw>
    </div>
  );
}
