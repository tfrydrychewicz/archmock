"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "tldraw";
import { extractDiagramGraph } from "./graph-extractor";
import type { DiagramGraph } from "@archmock/shared";

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function DiagramChangeNotifier({
  onDiagramChange,
}: {
  onDiagramChange: (graph: DiagramGraph) => void;
}) {
  const editor = useEditor();
  const onDiagramChangeRef = useRef(onDiagramChange);
  onDiagramChangeRef.current = onDiagramChange;

  useEffect(() => {
    const store = editor.store;
    const debouncedNotify = debounce(() => {
      try {
        const graph = extractDiagramGraph(editor);
        onDiagramChangeRef.current(graph);
      } catch (e) {
        console.warn("Failed to extract diagram graph:", e);
      }
    }, 2000);

    const cleanup = store.listen(debouncedNotify);

    const initialTimer = setTimeout(() => {
      try {
        const graph = extractDiagramGraph(editor);
        if (graph.nodes.length > 0 || graph.edges.length > 0) {
          onDiagramChangeRef.current(graph);
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      cleanup();
      clearTimeout(initialTimer);
    };
  }, [editor]);

  return null;
}
