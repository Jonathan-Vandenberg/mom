import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import NavUser from "@/components/NavUser";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "All Articles",
    description: settings.site_tagline,
  };
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const POSTS_PER_PAGE = 11;

// Repeating size pattern per page: large, medium, medium, small, small, small, large, medium, small, small, small, small
const SIZE_PATTERN = ["large", "medium", "medium", "small", "small", "small", "large", "medium", "small", "small", "small", "small"] as const;
type Size = typeof SIZE_PATTERN[number];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const [settings, supabase] = await Promise.all([
    getSiteSettings(),
    createClient(),
  ]);

  const { data: posts, count } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, cover_image, created_at", { count: "exact" })
    .eq("published", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / POSTS_PER_PAGE);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ color: "#3a3530" }}>

      {/* ── Masthead ── */}
      <header style={{ borderBottom: "3px double rgba(58,53,48,0.35)" }}>
        <div
          className="flex items-center justify-between px-6 py-1.5 text-xs"
          style={{ borderBottom: "1px solid rgba(58,53,48,0.2)" }}
        >
          <Link
            href="/"
            className="tracking-widest uppercase hover:underline"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ← {settings.site_name}
          </Link>
          <span style={{ fontFamily: "var(--font-heading)" }}>{today}</span>
          <NavUser />
        </div>

        <div className="text-center py-5 px-6">
          <Link href="/">
            <p
              className="text-3xl md:text-4xl font-bold uppercase tracking-tight leading-none hover:underline"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {settings.site_name}
            </p>
          </Link>
          <p className="text-xs tracking-[0.3em] uppercase mt-2" style={{ fontFamily: "var(--font-heading)" }}>
            ✦ All Articles ✦
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-8 py-2 text-xs tracking-widest uppercase"
          style={{ borderTop: "1px solid rgba(58,53,48,0.2)", borderBottom: "1px solid rgba(58,53,48,0.2)", fontFamily: "var(--font-heading)" }}
        >
          <Link href="/" className="hover:underline">Home</Link>
          <span style={{ color: "var(--color-accent)" }}>Latest Articles</span>
          {totalPages > 1 && (
            <span>Page {page} of {totalPages}</span>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {!posts || posts.length === 0 ? (
          <p className="text-center py-24 tracking-widest uppercase text-sm opacity-40">
            No articles published yet.
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-5" style={{ borderBottom: "2px solid rgba(58,53,48,0.25)", paddingBottom: "0.4rem" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>
                ● {count} Articles Published
              </h2>
            </div>

            {/* ── Organic grid — group consecutive smalls into columns ── */}
            {(() => {
              // Build segments: each segment is { size, posts[] }
              type Segment =
                | { size: "large"; post: typeof posts[0] }
                | { size: "medium"; post: typeof posts[0] }
                | { size: "small"; posts: typeof posts };

              const segments: Segment[] = [];
              let i = 0;
              while (i < posts.length) {
                const size = SIZE_PATTERN[i % SIZE_PATTERN.length];
                if (size === "small") {
                  // collect consecutive smalls
                  const group: typeof posts = [];
                  while (i < posts.length && SIZE_PATTERN[i % SIZE_PATTERN.length] === "small") {
                    group.push(posts[i]);
                    i++;
                  }
                  segments.push({ size: "small", posts: group });
                } else {
                  segments.push({ size, post: posts[i] });
                  i++;
                }
              }

              return segments.map((seg, si) => {
                if (seg.size === "large") {
                  const post = seg.post;
                  return (
                    <div key={post.id} className="grid grid-cols-1 md:grid-cols-2 gap-0 py-6" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                      {post.cover_image && (
                        <div className="relative overflow-hidden md:pr-6 w-full" style={{ aspectRatio: "16/9" }}>
                          <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                        </div>
                      )}
                      <div className={`flex flex-col justify-center ${post.cover_image ? "md:pl-2" : "md:col-span-2"} pt-4 md:pt-0`}>
                        <p className="text-sm uppercase tracking-widest opacity-50 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                          {formatShortDate(post.created_at)}
                        </p>
                        <Link href={`/blog/${post.slug}`} className="group">
                          <h2 className="font-bold leading-tight mb-3 group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem" }}>
                            {post.title}
                          </h2>
                        </Link>
                        {post.excerpt && <p className="leading-relaxed opacity-75 line-clamp-4" style={{ fontSize: "1rem" }}>{post.excerpt}</p>}
                        <Link href={`/blog/${post.slug}`} className="mt-4 text-sm uppercase tracking-widest hover:underline" style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent)" }}>
                          Continue Reading →
                        </Link>
                      </div>
                    </div>
                  );
                }

                if (seg.size === "medium") {
                  const post = seg.post;
                  return (
                    <div key={post.id} className="py-5" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                      <div className="flex gap-5">
                        {post.cover_image && (
                          <div className="relative shrink-0 overflow-hidden" style={{ width: "160px", aspectRatio: "16/9" }}>
                            <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="160px" />
                          </div>
                        )}
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <p className="text-sm uppercase tracking-widest opacity-50 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                            {formatShortDate(post.created_at)}
                          </p>
                          <Link href={`/blog/${post.slug}`} className="group">
                            <h3 className="font-bold leading-snug mb-2 group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem" }}>
                              {post.title}
                            </h3>
                          </Link>
                          {post.excerpt && <p className="leading-relaxed opacity-70 line-clamp-2" style={{ fontSize: "1rem" }}>{post.excerpt}</p>}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (seg.size === "small") {
                  // small group — chunk into rows of 3 (always odd)
                  const rows: typeof posts[] = [];
                  for (let r = 0; r < seg.posts.length; r += 3) {
                    rows.push(seg.posts.slice(r, r + 3));
                  }
                  return rows.map((row, ri) => (
                  <div
                    key={`small-group-${si}-${ri}`}
                    className="py-5"
                    style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}
                  >
                    <div
                      className="grid gap-0"
                      style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
                    >
                      {row.map((post, pi) => (
                        <div
                          key={post.id}
                          className="px-4 py-1 first:pl-0"
                          style={pi < row.length - 1 ? { borderRight: "1px solid rgba(58,53,48,0.12)" } : {}}
                        >
                          {post.cover_image && (
                            <div className="relative overflow-hidden mb-2 w-full" style={{ aspectRatio: "16/9" }}>
                              <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                            </div>
                          )}
                          <p className="text-sm uppercase tracking-widest opacity-40 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                            {formatShortDate(post.created_at)}
                          </p>
                          <Link href={`/blog/${post.slug}`} className="group">
                            <h4 className="font-bold leading-snug group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem" }}>
                              {post.title}
                            </h4>
                          </Link>
                          {post.excerpt && (
                            <p className="opacity-60 mt-1 line-clamp-2 leading-relaxed" style={{ fontSize: "0.95rem" }}>
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  ));
                }

                return null;
              });
            })()}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-center gap-2 mt-10 pt-6"
                style={{ borderTop: "2px solid #3a3530" }}
              >
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="px-4 py-2 text-xs uppercase tracking-widest hover:underline"
                    style={{ fontFamily: "var(--font-heading)", border: "1px solid #3a3530" }}
                  >
                    ← Previous
                  </Link>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/blog?page=${p}`}
                      className="w-8 h-8 flex items-center justify-center text-xs"
                      style={{
                        fontFamily: "var(--font-heading)",
                        border: "1px solid #3a3530",
                        background: p === page ? "#3a3530" : "transparent",
                        color: p === page ? "#f5f0e8" : "#3a3530",
                        fontWeight: p === page ? "bold" : "normal",
                      }}
                    >
                      {p}
                    </Link>
                  ))}
                </div>

                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="px-4 py-2 text-xs uppercase tracking-widest hover:underline"
                    style={{ fontFamily: "var(--font-heading)", border: "1px solid #3a3530" }}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="mt-8 py-6 px-6 text-center text-xs tracking-widest uppercase opacity-50"
        style={{ borderTop: "3px double rgba(58,53,48,0.35)", fontFamily: "var(--font-heading)" }}
      >
        {settings.site_name} &mdash; {settings.site_tagline}
      </footer>
    </div>
  );
}
