const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - default ElevenLabs voice

function getApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null;
}

export function isVoiceEnabled(): boolean {
  return !!getApiKey();
}

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" }),
    "audio.webm"
  );
  formData.append("model_id", "scribe_v2");

  const res = await fetch(`${ELEVENLABS_API}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs STT failed: ${res.status} ${err}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? "";
}

export async function* textToSpeechStream(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): AsyncGenerator<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const res = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128&optimize_streaming_latency=2`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${err}`);
  }

  const reader = res.body;
  if (!reader) throw new Error("No response body");

  const chunks: Buffer[] = [];
  for await (const chunk of reader as AsyncIterable<Uint8Array>) {
    const buf = Buffer.from(chunk);
    chunks.push(buf);
    yield buf;
  }
}
