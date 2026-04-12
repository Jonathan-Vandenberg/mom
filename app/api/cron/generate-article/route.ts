import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo=US";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

// Fetch trending topics from Google Trends RSS
async function fetchTrendingTopics(): Promise<string[]> {
  try {
    const res = await fetch(GOOGLE_TRENDS_RSS, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const xml = await res.text();

    // Parse titles from RSS XML
    const titles: string[] = [];
    const titleRegex = /<title><!\[CDATA\[(.+?)\]\]><\/title>/g;
    let match;
    while ((match = titleRegex.exec(xml)) !== null) {
      titles.push(match[1]);
    }

    // Also try without CDATA
    const titleRegex2 = /<title>([^<]+)<\/title>/g;
    while ((match = titleRegex2.exec(xml)) !== null) {
      if (match[1] !== "Daily Search Trends" && !titles.includes(match[1])) {
        titles.push(match[1]);
      }
    }

    return titles.slice(0, 20);
  } catch (err) {
    console.error("Failed to fetch Google Trends:", err);
    return [];
  }
}

// Use AI to pick the best geopolitics/economics topic and generate an article
async function generateArticle(
  topics: string[],
  apiKey: string,
  model: string
): Promise<{ title: string; content: string; excerpt: string } | null> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = `Today is ${today}. The current year is ${new Date().getFullYear()}.

Here are today's trending topics from Google Trends:
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Your task:
1. Pick the topic most relevant to GEOPOLITICS or ECONOMICS (international relations, conflicts, sanctions, trade, financial markets, crypto, central banking, energy politics). If none are directly relevant, find a geopolitical/economic angle on the most suitable topic.
2. Write a comprehensive, well-researched article about it.

Output your response in this EXACT format:

TITLE: [Article title here]

EXCERPT: [A compelling 1-2 sentence summary for SEO and social sharing]

ARTICLE:
[Full article in HTML format using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags.
Write 1500-2500 words.
Include an introduction, multiple sections with subheadings, and a conclusion.
Be analytical and authoritative in tone.
Include specific data points, names, and context where relevant.
Do NOT use markdown — use HTML tags only.]`;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      console.error("OpenRouter error:", await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    // Parse the response
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const excerptMatch = text.match(/EXCERPT:\s*(.+)/);
    const articleMatch = text.match(/ARTICLE:\s*([\s\S]+)/);

    if (!titleMatch || !articleMatch) {
      console.error("Failed to parse AI response");
      return null;
    }

    return {
      title: titleMatch[1].trim(),
      content: articleMatch[1].trim(),
      excerpt: excerptMatch ? excerptMatch[1].trim() : "",
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return null;
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPEN_ROUTER_API_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  // 1. Fetch trending topics
  const topics = await fetchTrendingTopics();
  if (topics.length === 0) {
    return NextResponse.json({ error: "No trending topics found" }, { status: 500 });
  }

  console.log(`[cron] Found ${topics.length} trending topics`);

  // 2. Check recent articles to avoid duplicates
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentTitles = (recentPosts || []).map((p) => p.title.toLowerCase());

  // Filter out topics that match recent articles
  const filteredTopics = topics.filter(
    (t) => !recentTitles.some((rt) => rt.includes(t.toLowerCase()) || t.toLowerCase().includes(rt))
  );

  const topicsToUse = filteredTopics.length > 0 ? filteredTopics : topics;

  // 3. Generate article
  const model = process.env.CRON_AI_MODEL || "x-ai/grok-4.20";
  const article = await generateArticle(topicsToUse, apiKey, model);

  if (!article) {
    return NextResponse.json({ error: "Failed to generate article" }, { status: 500 });
  }

  console.log(`[cron] Generated article: ${article.title}`);

  // 4. Get admin user for author_id
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  // 5. Save to database — auto-publish
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: article.title,
      slug: slugify(article.title),
      content: article.content,
      excerpt: article.excerpt,
      cover_image: "",
      author_name: "The Inner Path",
      meta_description: article.excerpt,
      meta_keywords: "",
      published: true,
      author_id: adminProfile?.id || null,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[cron] Failed to save article:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron] Published: ${post.slug}`);

  return NextResponse.json({
    success: true,
    title: article.title,
    slug: post.slug,
  });
}
