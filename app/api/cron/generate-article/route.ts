import { NextResponse } from "next/server";
import { generateAndPublishArticle } from "@/lib/generate-article";

// Manual trigger endpoint — call GET /api/cron/generate-article to test
export async function GET() {
  console.log("[cron] Manual trigger: generating article...");
  const result = await generateAndPublishArticle();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
