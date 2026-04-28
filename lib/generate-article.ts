import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { factCheckArticle } from "@/lib/fact-check";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo=US";

interface TrendingTopic {
  topic: string;
  newsUrl: string;
}

async function fetchTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const res = await fetch(GOOGLE_TRENDS_RSS, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const xml = await res.text();

    // Split into <item> blocks so we can associate each topic with its news URLs
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const results: TrendingTopic[] = [];

    for (const block of itemBlocks) {
      // Extract topic title (CDATA or plain)
      let topic = "";
      const cdataMatch = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/);
      const plainMatch = block.match(/<title>([^<]+)<\/title>/);
      if (cdataMatch) topic = cdataMatch[1];
      else if (plainMatch && plainMatch[1] !== "Daily Search Trends") topic = plainMatch[1];
      if (!topic) continue;

      // Extract first news item URL for this topic
      const newsUrlMatch = block.match(/<ht:news_item_url>([^<]+)<\/ht:news_item_url>/);
      const newsUrl = newsUrlMatch ? newsUrlMatch[1].trim() : "";

      results.push({ topic, newsUrl });
    }

    // Fallback: if item parsing found nothing, fall back to plain title extraction
    if (results.length === 0) {
      const titleRegex = /<title><!\[CDATA\[(.+?)\]\]><\/title>/g;
      const titleRegex2 = /<title>([^<]+)<\/title>/g;
      let match: RegExpExecArray | null;
      while ((match = titleRegex.exec(xml)) !== null) {
        results.push({ topic: match[1], newsUrl: "" });
      }
      while ((match = titleRegex2.exec(xml)) !== null) {
        const topic = match[1];
        if (topic !== "Daily Search Trends" && !results.some((r) => r.topic === topic)) {
          results.push({ topic, newsUrl: "" });
        }
      }
    }

    return results.slice(0, 20);
  } catch (err) {
    console.error("Failed to fetch Google Trends:", err);
    return [];
  }
}

const EXCERPT_STYLES = [
  "Start with the core tension or conflict at the heart of the story.",
  "Start with the single most consequential fact or figure in the story.",
  "Start with the name of a key player and what they did or said.",
  "Start with a bold declarative statement about what this means for the world.",
  "Start with a geographic location and the event unfolding there.",
  "Start with a cause-and-effect: what happened and its immediate consequence.",
  "Start with a surprising or counterintuitive angle on the story.",
  "Start with the question that the story answers.",
  "Start with the historical significance of what is happening.",
  "Start with the stakes — what is at risk and for whom.",
];

const OPENING_STYLES = [
  "Begin the first paragraph with a striking statistic or data point that immediately establishes the scale of the issue.",
  "Begin the first paragraph with a short, punchy declarative sentence of no more than eight words.",
  "Begin the first paragraph with a vivid scene — a specific place, moment, or person — that draws the reader in before widening to the broader story.",
  "Begin the first paragraph by posing a direct, provocative question to the reader.",
  "Begin the first paragraph with a brief, attributed quote from a world leader, analyst, or official relevant to the story.",
  "Begin the first paragraph with a historical parallel — a past event that mirrors the current situation — before pivoting to today.",
  "Begin the first paragraph with a blunt, contrarian observation that challenges the conventional wisdom on the topic.",
  "Begin the first paragraph with a geographic anchor — name a specific city or region and what is happening there right now.",
  "Begin the first paragraph with the most surprising or counterintuitive fact about the story.",
  "Begin the first paragraph with a cause-and-effect construction: what happened, and what it immediately triggered.",
];

async function callAI(
  trends: TrendingTopic[],
  recentPosts: { title: string; slug: string }[],
  apiKey: string,
  model: string
): Promise<{ title: string; content: string; excerpt: string; sourceUrl: string } | null> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const openingStyle = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
  const excerptStyle = EXCERPT_STYLES[Math.floor(Math.random() * EXCERPT_STYLES.length)];

  const topicList = trends
    .map((t, i) => `${i + 1}. ${t.topic}${t.newsUrl ? ` [source: ${t.newsUrl}]` : ""}`)
    .join("\n");

  const internalLinksSection =
    recentPosts.length > 0
      ? `
INTERNAL LINKING: Where topically natural, weave in 2–3 inline anchor links to these existing articles on this site. Use exact HTML: <a href="/blog/{slug}">{descriptive anchor text}</a>. Only insert links where they genuinely add context — never force them.

Existing articles:
${recentPosts.map((p) => `- ${p.title} → /blog/${p.slug}`).join("\n")}
`
      : "";

  const prompt = `Context for your knowledge: today's date is ${today}. Use this only to ensure factual accuracy — do NOT reference the date, mention "as of", "as of today", "as of [date]", or any similar temporal qualifier anywhere in the article. Write as a timeless, authoritative piece.

Here are today's trending topics from Google Trends:
${topicList}

Your task:
1. Pick the topic most relevant to GEOPOLITICS or ECONOMICS (international relations, conflicts, sanctions, trade, financial markets, crypto, central banking, energy politics). If none are directly relevant, find a geopolitical/economic angle on the most suitable topic.
2. Write a comprehensive, well-researched article about it.
3. Note the source URL of the topic you chose (the [source: ...] value next to your chosen topic, or empty string if none).

OPENING INSTRUCTION: ${openingStyle}
${internalLinksSection}
Output your response in this EXACT format:

TITLE: [Article title here]

EXCERPT: [A compelling 1-2 sentence summary for SEO and social sharing. ${excerptStyle} Do NOT start with "As", "As of", or any temporal qualifier.]

SOURCE_URL: [The source URL from your chosen topic, or empty string if none]

ARTICLE:
[Full article in HTML format using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a> tags.
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
    const sourceUrlMatch = text.match(/SOURCE_URL:\s*(.+)/);
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

    const rawSourceUrl = sourceUrlMatch ? cleanMarkdown(sourceUrlMatch[1]) : "";
    // Validate it looks like a URL, otherwise discard
    const sourceUrl = rawSourceUrl.startsWith("http") ? rawSourceUrl : "";

    return {
      title: cleanMarkdown(titleMatch[1]),
      content,
      excerpt: excerptMatch ? cleanMarkdown(excerptMatch[1]) : "",
      sourceUrl,
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return null;
  }
}

function buildSourceAttribution(sourceUrl: string): string {
  if (!sourceUrl) return "";
  return `<p class="source-attribution" style="margin-top:2rem;font-size:0.875rem;color:#6b7280;">Source: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer nofollow">Trending on Google News</a></p>`;
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

async function selectBacklinkCandidates(
  newTitle: string,
  newExcerpt: string,
  allPosts: { id: string; title: string; slug: string }[],
  apiKey: string,
  model: string
): Promise<{ id: string; title: string; slug: string }[]> {
  if (allPosts.length === 0) return [];

  const list = allPosts.map((p, i) => `${i + 1}. [${p.id}] ${p.title}`).join("\n");

  const prompt = `You are a content editor selecting which existing articles should receive a backlink to a newly published article.

New article:
Title: ${newTitle}
Summary: ${newExcerpt}

Existing articles:
${list}

Select 2–3 articles from the list above that are most topically related to the new article and where a backlink would read naturally in context. Return ONLY a JSON array of the selected article IDs, nothing else. Example: ["uuid-1","uuid-2"]`;

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
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const ids: string[] = JSON.parse(jsonMatch[0]);
    return allPosts.filter((p) => ids.includes(p.id));
  } catch {
    return [];
  }
}

async function injectBacklinkIntoPost(
  post: { id: string; title: string; slug: string; content: string },
  newTitle: string,
  newSlug: string,
  apiKey: string,
  model: string
): Promise<string | null> {
  const prompt = `You are a content editor adding a single internal link to an existing article.

Existing article title: ${post.title}
New article to link to: "${newTitle}" at /blog/${newSlug}

Instructions:
- Find ONE natural location in the existing article where a contextual inline link to the new article fits genuinely
- Insert exactly one anchor tag: <a href="/blog/${newSlug}">{descriptive anchor text}</a>
- The anchor text must describe the linked article's topic — never use "click here" or "read more"
- Do NOT change any other content, structure, or wording
- Return the full updated HTML article only — no commentary, no explanation

Existing article HTML:
${post.content}`;

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
        temperature: 0.2,
        max_tokens: 10000,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const updated: string = data.choices?.[0]?.message?.content ?? "";
    if (!updated.includes("<")) return null;

    // Strip any leading/trailing non-HTML commentary the AI may add
    const firstTag = updated.indexOf("<");
    const lastTag = updated.lastIndexOf(">");
    if (firstTag === -1 || lastTag === -1) return null;

    return updated.substring(firstTag, lastTag + 1);
  } catch {
    return null;
  }
}

export async function injectBacklinks(
  newPostId: string,
  newTitle: string,
  newExcerpt: string,
  newSlug: string,
  supabase: SupabaseClient,
  apiKey: string,
  model: string
): Promise<string[]> {
  const updatedSlugs: string[] = [];

  // 1. Fetch ALL post titles + slugs (no content)
  const { data: allPostMeta } = await supabase
    .from("posts")
    .select("id, title, slug")
    .eq("published", true)
    .neq("id", newPostId)
    .order("created_at", { ascending: false });

  if (!allPostMeta || allPostMeta.length === 0) return updatedSlugs;

  console.log(`[cron] Selecting backlink candidates from ${allPostMeta.length} posts…`);

  // 2. AI selects 2–3 most relevant posts (titles only, no content)
  const candidates = await selectBacklinkCandidates(
    newTitle,
    newExcerpt,
    allPostMeta,
    apiKey,
    model
  );

  if (candidates.length === 0) {
    console.log("[cron] No suitable backlink candidates found");
    return updatedSlugs;
  }

  console.log(`[cron] Selected ${candidates.length} posts for backlinking: ${candidates.map((c) => c.title).join(", ")}`);

  // 3. Fetch full content of only the selected posts
  const { data: fullPosts } = await supabase
    .from("posts")
    .select("id, title, slug, content")
    .in("id", candidates.map((c) => c.id));

  if (!fullPosts || fullPosts.length === 0) return updatedSlugs;

  // 4. Inject backlink into each selected post
  for (const post of fullPosts) {
    const updatedContent = await injectBacklinkIntoPost(
      post,
      newTitle,
      newSlug,
      apiKey,
      model
    );

    if (!updatedContent) {
      console.warn(`[cron] Could not inject backlink into: ${post.title}`);
      continue;
    }

    const { error } = await supabase
      .from("posts")
      .update({ content: updatedContent, updated_at: new Date().toISOString() })
      .eq("id", post.id);

    if (error) {
      console.error(`[cron] Failed to update post "${post.title}": ${error.message}`);
    } else {
      console.log(`[cron] Backlink injected into: ${post.title}`);
      updatedSlugs.push(post.slug);
    }
  }

  return updatedSlugs;
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
  cover_image?: string | null;
  error?: string;
  factCheck?: { issuesFound: boolean; summary: string };
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

  // 1. Fetch trending topics (with source news URLs)
  const trends = await fetchTrendingTopics();
  if (trends.length === 0) {
    return { success: false, error: "No trending topics found" };
  }

  console.log(`[cron] Found ${trends.length} trending topics`);

  // 2. Fetch ALL post titles + slugs — for duplicate-avoidance and outbound link candidates
  const { data: allPostMeta } = await supabase
    .from("posts")
    .select("id, title, slug")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const recentTitles = (allPostMeta || []).slice(0, 10).map((p) => p.title.toLowerCase());

  const filteredTrends = trends.filter(
    (t) =>
      !recentTitles.some(
        (rt) => rt.includes(t.topic.toLowerCase()) || t.topic.toLowerCase().includes(rt)
      )
  );

  const trendsToUse = filteredTrends.length > 0 ? filteredTrends : trends;

  // Pass all post titles as outbound link candidates (titles+slugs only — no content)
  const linkCandidates = (allPostMeta || []).map((p) => ({
    title: p.title,
    slug: p.slug,
  }));

  // 3. Generate article (with internal linking candidates)
  const model = process.env.CRON_AI_MODEL || "x-ai/grok-4.20";
  const article = await callAI(trendsToUse, linkCandidates, apiKey, model);

  if (!article) {
    return { success: false, error: "Failed to generate article" };
  }

  console.log(`[cron] Generated article: ${article.title}`);
  if (article.sourceUrl) {
    console.log(`[cron] Source URL: ${article.sourceUrl}`);
  }

  // 4. Append source attribution to article content
  const contentWithAttribution = article.content + buildSourceAttribution(article.sourceUrl);

  // 5. Generate cover image
  const coverImage = await generateCoverImage(
    article.title,
    article.excerpt,
    apiKey,
    supabase
  );

  // 6. Get admin user for author_id
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  // 7. Save to database — auto-publish
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: article.title,
      slug: slugify(article.title),
      content: contentWithAttribution,
      excerpt: article.excerpt,
      cover_image: coverImage,
      author_name: "Jonathan van den Berg",
      meta_description: article.excerpt,
      meta_keywords: "",
      published: true,
      author_id: adminProfile?.id || null,
      source_url: article.sourceUrl || null,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[cron] Failed to save article:", error.message);
    return { success: false, error: error.message };
  }

  console.log(`[cron] Published: ${post.slug}`);

  // 8. Inject backlinks into related existing articles
  await injectBacklinks(
    post.id,
    article.title,
    article.excerpt,
    post.slug,
    supabase,
    apiKey,
    model
  );

  // 9. Fact-check the article and apply any corrections
  console.log(`[cron] Running fact-check on post ${post.id}…`);
  const factCheck = await factCheckArticle(
    post.id,
    article.title,
    article.excerpt,
    contentWithAttribution,
    supabase
  );
  if (factCheck.issuesFound) {
    console.log(`[cron] Fact-check corrections applied: ${factCheck.summary}`);
  } else if (factCheck.success) {
    console.log(`[cron] Fact-check passed: ${factCheck.summary}`);
  } else {
    console.warn(`[cron] Fact-check failed: ${factCheck.error}`);
  }

  return {
    success: true,
    title: article.title,
    slug: post.slug,
    cover_image: coverImage || null,
    factCheck: { issuesFound: factCheck.issuesFound, summary: factCheck.summary },
  };
}
