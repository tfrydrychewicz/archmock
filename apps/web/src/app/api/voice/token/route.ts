import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Voice not configured (ELEVENLABS_API_KEY)" },
        { status: 503 }
      );
    }

    const res = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs token error:", res.status, err);
      return NextResponse.json(
        { error: "Failed to create voice token" },
        { status: 502 }
      );
    }

    const { token } = (await res.json()) as { token: string };
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Voice token error:", err);
    return NextResponse.json(
      { error: "Failed to create voice token" },
      { status: 500 }
    );
  }
}
