"use client";

import { useCallback, useRef, useState } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";

export function useVoiceScribe(onCommittedTranscript: (text: string) => void) {
  const onCommittedRef = useRef(onCommittedTranscript);
  onCommittedRef.current = onCommittedTranscript;

  const [tokenError, setTokenError] = useState<string | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.0,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    // Fallback: some SDK versions require audioFormat + sampleRate
    audioFormat: "pcm_16000",
    sampleRate: 16000,
    onCommittedTranscript: useCallback((data: { text: string }) => {
      const text = data.text?.trim();
      if (text) {
        onCommittedRef.current(text);
      }
    }, []),
  });

  const connect = useCallback(async () => {
    setTokenError(null);
    try {
      const res = await fetch("/api/voice/token", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to get voice token");
      }
      const { token: t } = (await res.json()) as { token: string };
      await scribe.connect({
        token: t,
        modelId: "scribe_v2_realtime",
        commitStrategy: CommitStrategy.VAD,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        audioFormat: "pcm_16000",
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
    tokenError,
    isConnected: scribe.isConnected,
    isTranscribing: scribe.isTranscribing,
  };
}
