import { NextRequest, NextResponse } from "next/server";
import { generateAndPublishArticle } from "@/lib/generate-article";

export async function GET(request: NextRequest) {
  // Vercel Cron sends this header automatically
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] Generating article...");
  const result = await generateAndPublishArticle();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
