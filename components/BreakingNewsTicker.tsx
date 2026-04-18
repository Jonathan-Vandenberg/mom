import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function BreakingNewsTicker() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!posts || posts.length === 0) return null;

  // Duplicate so the marquee loops seamlessly
  const items = [...posts, ...posts];

  return (
    <div
      className="overflow-hidden"
      style={{
        borderTop: "1px solid rgba(58,53,48,0.2)",
        borderBottom: "1px solid rgba(58,53,48,0.2)",
      }}
    >
      <div className="flex items-stretch">
        {/* Scrolling headlines */}
        <div className="overflow-hidden flex-1">
          <div className="ticker-track flex">
            {items.map((post, i) => (
              <span key={i} className="inline-flex items-center shrink-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-block px-5 py-1.5 text-[11px] uppercase tracking-widest hover:underline whitespace-nowrap"
                  style={{ fontFamily: "var(--font-heading)", color: "#3a3530" }}
                >
                  {post.title}
                </Link>
                <span className="text-stone-300 text-[10px] select-none">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
