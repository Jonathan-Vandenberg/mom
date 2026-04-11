import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/images/generations";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  try {
    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Call OpenRouter image generation
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: model || "openai/dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const imageUrl = data.data?.[0]?.url;
    const imageB64 = data.data?.[0]?.b64_json;

    if (!imageUrl && !imageB64) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    // Upload to Supabase storage
    let imageBuffer: Buffer;
    if (imageB64) {
      imageBuffer = Buffer.from(imageB64, "base64");
    } else {
      const imgRes = await fetch(imageUrl);
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    }

    const supabase = await createClient();
    const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(filename, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      // If upload fails, return the original URL (temporary but usable)
      return NextResponse.json({ url: imageUrl || `data:image/png;base64,${imageB64}` });
    }

    const { data: publicUrl } = supabase.storage
      .from("blog-images")
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
