import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

export async function GET() {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: res.status });
    }

    const data = await res.json();
    const models = (data.data || [])
      .filter((m: any) => {
        const id = m.id?.toLowerCase() || "";
        const modality = m.architecture?.modality?.toLowerCase() || "";
        // Exclude embedding, TTS, and speech models
        return (
          modality !== "embeddings" &&
          !id.includes("embedding") &&
          !id.includes("tts") &&
          !id.includes("text-to-speech") &&
          !id.includes("whisper")
        );
      })
      .map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        pricing: m.pricing
          ? { prompt: m.pricing.prompt, completion: m.pricing.completion }
          : undefined,
      }));

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
