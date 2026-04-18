import { SupabaseClient } from "@supabase/supabase-js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface MarketData {
  bitcoin?: { usd: number; usd_24h_change: number; usd_ath: number };
  ethereum?: { usd: number; usd_24h_change: number; usd_ath: number };
  [key: string]: { usd: number; usd_24h_change: number; usd_ath: number } | undefined;
}

async function fetchMarketData(): Promise<string> {
  try {
    const [priceRes, athRes] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true",
        { next: { revalidate: 300 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,ripple&order=market_cap_desc&per_page=4&page=1&sparkline=false",
        { next: { revalidate: 300 } }
      ),
    ]);

    if (!priceRes.ok || !athRes.ok) return "";

    const prices: MarketData = await priceRes.json();
    const athData: Array<{ id: string; ath: number; ath_change_percentage: number; current_price: number }> =
      await athRes.json();

    const lines: string[] = ["LIVE MARKET DATA (verified, use this to fact-check price claims):"];

    for (const coin of athData) {
      const price = prices[coin.id];
      if (!price) continue;
      const pctFromAth = coin.ath_change_percentage.toFixed(1);
      lines.push(
        `- ${coin.id.charAt(0).toUpperCase() + coin.id.slice(1)}: $${coin.current_price.toLocaleString()} USD` +
        ` | ATH: $${coin.ath.toLocaleString()} | ${pctFromAth}% from ATH` +
        ` | 24h change: ${price.usd_24h_change.toFixed(2)}%`
      );
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

export interface FactCheckResult {
  success: boolean;
  issuesFound: boolean;
  summary: string;
  error?: string;
}

export async function factCheckArticle(
  postId: string,
  title: string,
  excerpt: string,
  content: string,
  supabase: SupabaseClient
): Promise<FactCheckResult> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, issuesFound: false, summary: "", error: "OPEN_ROUTER_API_KEY not set" };
  }

  const model =
    process.env.FACT_CHECK_MODEL ||
    process.env.CRON_AI_MODEL ||
    "x-ai/grok-3-mini";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const marketData = await fetchMarketData();

  const prompt = `Today is ${today}.
${marketData ? `\n${marketData}\n` : ""}

You are a professional fact-checker for a news publication. Review the following article — title, excerpt, and body — for factual accuracy.

TITLE:
${title}

EXCERPT:
${excerpt}

ARTICLE BODY (HTML):
${content}

Your task:
1. Identify any specific factual claims that are CLEARLY INCORRECT — wrong dates, wrong statistics, misattributed quotes, incorrect historical facts, wrong names/positions, etc.
2. Do NOT flag opinions, predictions, analysis, or stylistic choices.
3. Do NOT flag claims you are merely uncertain about — only flag clearly demonstrable errors.
4. Check each field (title, excerpt, body) independently.

Respond in EXACTLY this format (no extra text before or after):

VERDICT: ACCURATE
SUMMARY: No factual errors detected.
CORRECTED_TITLE: NONE
CORRECTED_EXCERPT: NONE
CORRECTED_CONTENT: NONE

— OR —

VERDICT: CORRECTIONS_NEEDED
SUMMARY: [One sentence describing what was corrected]
CORRECTED_TITLE: [corrected title text, or NONE if title is accurate]
CORRECTED_EXCERPT: [corrected excerpt text, or NONE if excerpt is accurate]
CORRECTED_CONTENT: [Full article HTML with only the incorrect parts fixed, or NONE if body is accurate]`;

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
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[fact-check] API error:", errText);
      return { success: false, issuesFound: false, summary: "", error: errText };
    }

    const data = await res.json();
    const text: string | undefined = data.choices?.[0]?.message?.content;
    if (!text) {
      return { success: false, issuesFound: false, summary: "", error: "Empty AI response" };
    }

    const verdictMatch = text.match(/VERDICT:\s*(\S+)/);
    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]+?)(?:\nCORRECTED_TITLE|$)/);
    const titleMatch = text.match(/CORRECTED_TITLE:\s*([\s\S]+?)(?:\nCORRECTED_EXCERPT|$)/);
    const excerptMatch = text.match(/CORRECTED_EXCERPT:\s*([\s\S]+?)(?:\nCORRECTED_CONTENT|$)/);
    const contentMatch = text.match(/CORRECTED_CONTENT:\s*([\s\S]+)/);

    const verdict = verdictMatch?.[1]?.trim();
    const summary = summaryMatch?.[1]?.trim() ?? "Fact-check complete";

    const correctedTitle = titleMatch?.[1]?.trim();
    const correctedExcerpt = excerptMatch?.[1]?.trim();
    const correctedContent = contentMatch?.[1]?.trim();

    const hasNone = (v: string | undefined) => !v || v === "NONE";

    const issuesFound =
      verdict === "CORRECTIONS_NEEDED" &&
      (!hasNone(correctedTitle) || !hasNone(correctedExcerpt) || !hasNone(correctedContent));

    if (issuesFound) {
      const updates: Record<string, string> = {
        updated_at: new Date().toISOString(),
      };

      if (!hasNone(correctedTitle)) {
        updates.title = correctedTitle!;
      }

      if (!hasNone(correctedExcerpt)) {
        updates.excerpt = correctedExcerpt!;
      }

      if (!hasNone(correctedContent)) {
        let cleanedContent = correctedContent!;
        const lastTagIndex = cleanedContent.lastIndexOf(">");
        if (lastTagIndex !== -1 && lastTagIndex < cleanedContent.length - 1) {
          cleanedContent = cleanedContent.substring(0, lastTagIndex + 1);
        }
        updates.content = cleanedContent;
      }

      const { error: updateError } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", postId);

      if (updateError) {
        console.error("[fact-check] Failed to update post:", updateError.message);
        return { success: false, issuesFound: true, summary, error: updateError.message };
      }

      console.log(`[fact-check] Corrections applied to post ${postId}: ${summary}`);
    } else {
      console.log(`[fact-check] Post ${postId} passed fact-check: ${summary}`);
    }

    return { success: true, issuesFound, summary };
  } catch (err) {
    console.error("[fact-check] Error:", err);
    return { success: false, issuesFound: false, summary: "", error: String(err) };
  }
}
