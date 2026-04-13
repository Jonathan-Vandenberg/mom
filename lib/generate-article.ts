import { createClient, SupabaseClient } from "@supabase/supabase-js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo=US";

async function fetchTrendingTopics(): Promise<string[]> {
  try {
    const res = await fetch(GOOGLE_TRENDS_RSS, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const xml = await res.text();

    const titles: string[] = [];
    const titleRegex = /<title><!\[CDATA\[(.+?)\]\]><\/title>/g;
    let match;
    while ((match = titleRegex.exec(xml)) !== null) {
      titles.push(match[1]);
    }

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

async function callAI(
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
Do NOT use markdown — use HTML tags only.
IMPORTANT: Do NOT include any meta-commentary, word counts, notes, disclaimers, or anything that reveals this was AI-generated. Output ONLY the article HTML, nothing else after it.]`;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
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

    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const excerptMatch = text.match(/EXCERPT:\s*(.+)/);
    const articleMatch = text.match(/ARTICLE:\s*([\s\S]+)/);

    if (!titleMatch || !articleMatch) {
      console.error("Failed to parse AI response");
      return null;
    }

    // Strip markdown artifacts (**, *, etc.) the AI may wrap around values
    const cleanMarkdown = (s: string) => s.replace(/^\*+\s*|\s*\*+$/g, "").trim();

    // Ensure HTML content starts with an HTML tag (strip any leading non-HTML text)
    let content = articleMatch[1].trim();
    const firstTagIndex = content.indexOf("<");
    if (firstTagIndex > 0) {
      content = content.substring(firstTagIndex);
    }

    // Strip trailing non-HTML content (word counts, disclaimers, notes, etc.)
    const lastClosingTag = content.lastIndexOf(">");
    if (lastClosingTag !== -1 && lastClosingTag < content.length - 1) {
      content = content.substring(0, lastClosingTag + 1);
    }

    return {
      title: cleanMarkdown(titleMatch[1]),
      content,
      excerpt: excerptMatch ? cleanMarkdown(excerptMatch[1]) : "",
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return null;
  }
}

async function generateCoverImage(
  title: string,
  excerpt: string,
  apiKey: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const imagePrompt = `Editorial photograph for a geopolitics and economics article titled "${title}". ${excerpt}. Style: photojournalistic, dramatic lighting, no text or words in the image.`;

    const model = process.env.CRON_IMAGE_MODEL || "google/gemini-3.1-flash-image-preview";

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      console.error("[cron] Image generation API error:", await res.text());
      return "";
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    // OpenRouter returns images in message.images array
    let imageB64: string | null = null;
    let imageUrl: string | null = null;

    // Check message.images (documented format)
    const images = message?.images;
    if (Array.isArray(images) && images.length > 0) {
      const url = images[0]?.image_url?.url;
      if (url?.startsWith("data:image/")) {
        imageB64 = url.split(",")[1];
      } else if (url) {
        imageUrl = url;
      }
    }

    // Fallback: check message.content (some models put it here)
    if (!imageB64 && !imageUrl) {
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          const url = part?.image_url?.url;
          if (url?.startsWith("data:image/")) {
            imageB64 = url.split(",")[1];
            break;
          } else if (url) {
            imageUrl = url;
            break;
          }
        }
      } else if (typeof content === "string" && content.startsWith("data:image/")) {
        imageB64 = content.split(",")[1];
      }
    }

    if (!imageB64 && !imageUrl) {
      console.error("[cron] No image in response");
      return "";
    }

    // Get image bytes
    let imageBuffer: Buffer;
    if (imageB64) {
      imageBuffer = Buffer.from(imageB64, "base64");
    } else {
      const imgRes = await fetch(imageUrl!);
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    }

    // Upload to Supabase storage
    const isJpeg = imageB64 ? true : false; // Gemini returns JPEG
    const ext = isJpeg ? "jpg" : "png";
    const contentType = isJpeg ? "image/jpeg" : "image/png";
    const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(filename, imageBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[cron] Image upload error:", uploadError.message);
      return imageUrl || "";
    }

    const { data: publicUrl } = supabase.storage
      .from("blog-images")
      .getPublicUrl(filename);

    console.log(`[cron] Cover image uploaded: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (err) {
    console.error("[cron] Cover image generation failed:", err);
    return "";
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

export async function generateAndPublishArticle(): Promise<{
  success: boolean;
  title?: string;
  slug?: string;
  error?: string;
}> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OPEN_ROUTER_API_KEY not set" };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  // 1. Fetch trending topics
  const topics = await fetchTrendingTopics();
  if (topics.length === 0) {
    return { success: false, error: "No trending topics found" };
  }

  console.log(`[cron] Found ${topics.length} trending topics`);

  // 2. Check recent articles to avoid duplicates
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentTitles = (recentPosts || []).map((p) => p.title.toLowerCase());

  const filteredTopics = topics.filter(
    (t) =>
      !recentTitles.some(
        (rt) => rt.includes(t.toLowerCase()) || t.toLowerCase().includes(rt)
      )
  );

  const topicsToUse = filteredTopics.length > 0 ? filteredTopics : topics;

  // 3. Generate article
  const model = process.env.CRON_AI_MODEL || "x-ai/grok-4.20";
  const article = await callAI(topicsToUse, apiKey, model);

  if (!article) {
    return { success: false, error: "Failed to generate article" };
  }

  console.log(`[cron] Generated article: ${article.title}`);

  // 4. Generate cover image
  const coverImage = await generateCoverImage(
    article.title,
    article.excerpt,
    apiKey,
    supabase
  );

  // 5. Get admin user for author_id
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  // 6. Save to database — auto-publish
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: article.title,
      slug: slugify(article.title),
      content: article.content,
      excerpt: article.excerpt,
      cover_image: coverImage,
      author_name: "Jonathan van den Berg",
      meta_description: article.excerpt,
      meta_keywords: "",
      published: true,
      author_id: adminProfile?.id || null,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[cron] Failed to save article:", error.message);
    return { success: false, error: error.message };
  }

  console.log(`[cron] Published: ${post.slug}`);

  return {
    success: true,
    title: article.title,
    slug: post.slug,
    cover_image: coverImage || null,
  };
}
