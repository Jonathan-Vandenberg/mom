/**
 * Backfill meta descriptions for posts that have none.
 *
 * Uses Grok (via OpenRouter) to read each post and write an SEO-optimised
 * meta description of 150-160 characters.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-meta-descriptions.mjs
 *
 * Dry-run (preview without writing to the database):
 *   DRY_RUN=1 node --env-file=.env.local scripts/backfill-meta-descriptions.mjs
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.env.DRY_RUN === "1";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openRouterKey = process.env.OPEN_ROUTER_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!openRouterKey) {
  console.error("Missing OPEN_ROUTER_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

/** Strip HTML tags so we send readable prose to the model. */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip Markdown syntax. */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toPlainText(content) {
  if (!content) return "";
  return /<[a-z][\s\S]*>/i.test(content) ? stripHtml(content) : stripMarkdown(content);
}

/**
 * Call Grok via OpenRouter to generate a meta description.
 * Returns a trimmed string, or throws on error.
 */
async function generateWithGrok(title, plainText) {
  // Keep the content snippet short to avoid large token costs
  const snippet = plainText.slice(0, 2000);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "x-ai/grok-3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an SEO expert. Write a single meta description for the given article. " +
            "Requirements: 150-160 characters, engaging, includes the main topic, " +
            "no quotes, no hashtags, plain text only. Return ONLY the meta description.",
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent:\n${snippet}`,
        },
      ],
      max_tokens: 80,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";

  if (!text) throw new Error("Empty response from model");

  // Hard-truncate just in case the model goes over
  return text.length > 160 ? text.slice(0, 157) + "..." : text;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("Fetching all posts…\n");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, slug, content, excerpt, meta_description")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  console.log(`Found ${posts.length} post(s) to update.\n`);

  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    process.stdout.write(`  Processing "${post.title}"… `);

    try {
      const plainText = toPlainText(post.content) || post.excerpt || "";
      const description = await generateWithGrok(post.title, plainText);

      console.log(`\n    → ${description}\n`);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            meta_description: description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        if (updateError) {
          console.error(`    ✗ DB update failed: ${updateError.message}`);
          skipped++;
          continue;
        }
      }

      updated++;
    } catch (err) {
      console.error(`\n    ✗ Skipped — ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
