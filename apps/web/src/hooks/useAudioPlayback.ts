"use client";

import { useCallback, useRef } from "react";

export function useAudioPlayback(onDone?: () => void) {
  const chunksRef = useRef<string[]>([]);

  const playChunk = useCallback((base64Chunk: string) => {
    chunksRef.current.push(base64Chunk);
  }, []);

  const playAll = useCallback(() => {
    const chunks = chunksRef.current;
    chunksRef.current = [];

    if (chunks.length === 0) {
      onDone?.();
      return;
    }

    const binary = new Uint8Array(
      chunks.flatMap((c) => {
        const bin = atob(c);
        return [...bin].map((ch) => ch.charCodeAt(0));
      })
    );
    const blob = new Blob([binary], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      onDone?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      onDone?.();
    };
    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      URL.revokeObjectURL(url);
      onDone?.();
    });
  }, [onDone]);

  return { playChunk, playAll };
}
