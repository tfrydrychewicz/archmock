"use client";

import { useCallback, useRef, useState } from "react";
import { useScribe, CommitStrategy, AudioFormat } from "@elevenlabs/react";

const TOKEN_CACHE_MS = 90_000; // 90 seconds

export function useVoiceScribe(onCommittedTranscript: (text: string) => void) {
  const onCommittedRef = useRef(onCommittedTranscript);
  onCommittedRef.current = onCommittedTranscript;

  const [tokenError, setTokenError] = useState<string | null>(null);
  const tokenCacheRef = useRef<{ token: string; fetchedAt: number } | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 0.5,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: 16000,
    onCommittedTranscript: useCallback((data: { text: string }) => {
      const text = data.text?.trim();
      if (text) {
        console.debug(`[Voice] Scribe committed: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`);
        onCommittedRef.current(text);
      }
    }, []),
  });

  const prefetchToken = useCallback(async () => {
    const cached = tokenCacheRef.current;
    if (cached && Date.now() - cached.fetchedAt < TOKEN_CACHE_MS) return;
    try {
      const res = await fetch("/api/voice/token", { method: "POST" });
      if (!res.ok) return;
      const { token } = (await res.json()) as { token: string };
      tokenCacheRef.current = { token, fetchedAt: Date.now() };
    } catch {
      // ignore prefetch errors
    }
  }, []);

  const connect = useCallback(async () => {
    setTokenError(null);
    try {
      let t: string;
      const cached = tokenCacheRef.current;
      if (cached && Date.now() - cached.fetchedAt < TOKEN_CACHE_MS) {
        t = cached.token;
        tokenCacheRef.current = null;
      } else {
        const res = await fetch("/api/voice/token", { method: "POST" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to get voice token");
        }
        const data = (await res.json()) as { token: string };
        t = data.token;
      }
      await scribe.connect({
        token: t,
        modelId: "scribe_v2_realtime",
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 0.5,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Failed to connect");
      console.error("Voice scribe connect error:", err);
    }
  }, [scribe]);

  const disconnect = useCallback(() => {
    scribe.disconnect();
  }, [scribe]);

  return {
    ...scribe,
    connect,
    disconnect,
    prefetchToken,
    tokenError,
    isConnected: scribe.isConnected,
    isTranscribing: scribe.isTranscribing,
  };
}
