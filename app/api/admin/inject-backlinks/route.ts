import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { injectBacklinks } from "@/lib/generate-article";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId, title, excerpt, slug } = await request.json();

  if (!postId || !title || !slug) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPEN_ROUTER_API_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  const model = process.env.CRON_AI_MODEL || "x-ai/grok-4.20";

  const updatedSlugs = await injectBacklinks(postId, title, excerpt || "", slug, supabase, apiKey, model);

  for (const s of updatedSlugs) {
    revalidatePath(`/blog/${s}`);
  }

  return NextResponse.json({ success: true, updatedSlugs });
}
