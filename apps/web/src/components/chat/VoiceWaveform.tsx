"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated waveform visualization for voice mode.
 * Uses Web Audio API when connected (mic active), otherwise shows idle animation.
 */
export function VoiceWaveform({
  isActive,
  isConnected,
  isPlayingAudio,
}: {
  isActive: boolean;
  isConnected: boolean;
  isPlayingAudio: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  useEffect(() => {
    if (!isActive || !isConnected) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      setHasAudioAccess(false);
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioContext = new AudioContext();
        if (cancelled) {
          audioContext.close();
          return;
        }
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -60;
        analyser.maxDecibels = -10;
        source.connect(analyser);
        analyserRef.current = analyser;
        setHasAudioAccess(true);
      } catch (err) {
        console.warn("Voice waveform: could not access microphone", err);
        setHasAudioAccess(false);
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, [isActive, isConnected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128);
    const bufferLength = dataArray.length;
    const barCount = Math.min(64, Math.floor(bufferLength / 2));

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width !== canvas.width || rect.height !== canvas.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      if (canvas.width === 0 || canvas.height === 0) return;

      const centerY = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "hsl(var(--destructive) / 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();

      if (analyserRef.current && hasAudioAccess && isConnected) {
        analyserRef.current.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[Math.floor((i / barCount) * bufferLength)] ?? 0;
          const barHeight = (value / 255) * (canvas.height * 0.4);
          const x = i * (canvas.width / barCount);
          const barWidth = canvas.width / barCount - 2;

          ctx.fillStyle = "hsl(142 76% 36% / 0.9)";
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
      } else if (isPlayingAudio) {
        const t = Date.now() / 200;
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(t + i * 0.3) * 0.5 + Math.sin(t * 1.3 + i * 0.2) * 0.3;
          const barHeight = (0.3 + wave * 0.4) * canvas.height * 0.35;
          const x = i * (canvas.width / barCount);
          const barWidth = canvas.width / barCount - 2;

          ctx.fillStyle = "hsl(var(--primary) / 0.6)";
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
      } else {
        const t = Date.now() / 400;
        for (let i = 0; i < barCount; i++) {
          const idle = Math.sin(t + i * 0.15) * 0.15 + 0.1;
          const barHeight = idle * canvas.height * 0.3;
          const x = i * (canvas.width / barCount);
          const barWidth = canvas.width / barCount - 2;

          ctx.fillStyle = "hsl(var(--muted-foreground) / 0.3)";
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
      }
    };

    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isConnected, isPlayingAudio, hasAudioAccess]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        className="h-full w-full block"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
