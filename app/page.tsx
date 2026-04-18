import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import NavUser from "@/components/NavUser";
import BreakingNewsTicker from "@/components/BreakingNewsTicker";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.site_name,
    description: settings.site_tagline,
  };
}

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const POSTS_PER_PAGE = 11;

const SIZE_PATTERN = ["large", "medium", "medium", "small", "small", "small", "large", "medium", "small", "small", "small", "small"] as const;

export default async function Home({
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

  const [{ data: posts, count }, { data: morePosts }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, excerpt, cover_image, created_at", { count: "exact" })
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("posts")
      .select("id, title, slug, excerpt, cover_image, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(to + 1, to + 6),
  ]);

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
          <span style={{ fontFamily: "var(--font-heading)" }}>{today}</span>
          <NavUser />
        </div>

        <div className="text-center py-6 px-6">
          <Link href="/">
            <h1
              className="text-5xl md:text-7xl font-bold uppercase tracking-tight leading-none hover:opacity-80 transition-opacity"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {settings.site_name}
            </h1>
          </Link>
          <p className="text-xs tracking-[0.3em] uppercase mt-3" style={{ fontFamily: "var(--font-heading)" }}>
            ✦ {settings.site_tagline} ✦
          </p>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-center py-2 text-xs tracking-widest uppercase"
            style={{ borderTop: "1px solid rgba(58,53,48,0.2)", borderBottom: "1px solid rgba(58,53,48,0.2)", fontFamily: "var(--font-heading)" }}
          >
            <span>Page {page} of {totalPages}</span>
          </div>
        )}
        <BreakingNewsTicker />
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        {!posts || posts.length === 0 ? (
          <p className="text-center py-24 tracking-widest uppercase text-sm opacity-40">
            No articles published yet.
          </p>
        ) : (
          <>
            {/* ── Organic article grid ── */}
            {(() => {
              type Segment =
                | { size: "large"; post: typeof posts[0] }
                | { size: "medium"; post: typeof posts[0] }
                | { size: "small"; posts: typeof posts };

              const segments: Segment[] = [];
              let i = 0;
              while (i < posts.length) {
                const size = SIZE_PATTERN[i % SIZE_PATTERN.length];
                if (size === "small") {
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

              const moreArticlesBlock = morePosts && morePosts.length > 0 ? (() => {
                const featured = morePosts[0];
                const rest = morePosts.slice(1);
                return (
                  <div key="more-articles" className="grid grid-cols-1 md:grid-cols-2 gap-0 py-6" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                    <div className="flex flex-col justify-start md:pr-8" style={{ borderRight: "1px solid rgba(58,53,48,0.15)" }}>
                      {featured.cover_image && (
                        <div className="relative overflow-hidden mb-3 w-full" style={{ aspectRatio: "16/9" }}>
                          <Image src={featured.cover_image} alt={featured.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                        </div>
                      )}
                      <p className="text-xs uppercase tracking-widest opacity-50 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                        {formatShortDate(featured.created_at)}
                      </p>
                      <Link href={`/blog/${featured.slug}`} className="group">
                        <h3 className="font-bold leading-snug mb-2 group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem" }}>
                          {featured.title}
                        </h3>
                      </Link>
                      {featured.excerpt && (
                        <p className="leading-relaxed opacity-70 line-clamp-3 mt-1" style={{ fontSize: "0.95rem" }}>
                          {featured.excerpt}
                        </p>
                      )}
                      <Link href={`/blog/${featured.slug}`} className="mt-3 text-xs uppercase tracking-widest hover:underline" style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent)" }}>
                        Continue Reading →
                      </Link>
                    </div>
                    {rest.length > 0 && (
                      <div className="md:pl-8 pt-6 md:pt-0">
                        <h5 className="text-xs font-bold uppercase tracking-widest pb-2 mb-3" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)", fontFamily: "var(--font-heading)" }}>
                          ● More Articles
                        </h5>
                        <div className="flex flex-col">
                          {rest.map((post, ri) => (
                            <div key={post.id} className="flex gap-3 py-3" style={ri < rest.length - 1 ? { borderBottom: "1px solid rgba(58,53,48,0.1)" } : {}}>
                              <span className="text-xl font-bold text-stone-200 leading-none shrink-0 select-none" style={{ fontFamily: "var(--font-heading)" }}>{ri + 1}.</span>
                              <div>
                                <Link href={`/blog/${post.slug}`} className="group">
                                  <p className="text-sm font-bold leading-snug group-hover:underline" style={{ fontFamily: "var(--font-heading)" }}>{post.title}</p>
                                </Link>
                                <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">{formatShortDate(post.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : null;

              const result: React.ReactNode[] = [];
              segments.forEach((seg, si) => {
                if (seg.size === "large") {
                  const post = seg.post;
                  result.push(
                    <div key={post.id} className="grid grid-cols-1 md:grid-cols-2 gap-0 py-6" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                      {post.cover_image && (
                        <div className="relative overflow-hidden md:pr-6 w-full" style={{ aspectRatio: "16/9" }}>
                          <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                        </div>
                      )}
                      <div className={`flex flex-col justify-center ${post.cover_image ? "md:pl-5" : "md:col-span-2"} pt-4 md:pt-0`}>
                        <p className="text-sm uppercase tracking-widest opacity-50 mb-2" style={{ fontFamily: "var(--font-heading)" }}>{formatShortDate(post.created_at)}</p>
                        <Link href={`/blog/${post.slug}`} className="group">
                          <h2 className="font-bold leading-tight mb-3 group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem" }}>{post.title}</h2>
                        </Link>
                        {post.excerpt && <p className="leading-relaxed opacity-75 line-clamp-4" style={{ fontSize: "1rem" }}>{post.excerpt}</p>}
                        <Link href={`/blog/${post.slug}`} className="mt-4 text-sm uppercase tracking-widest hover:underline" style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent)" }}>Continue Reading →</Link>
                      </div>
                    </div>
                  );
                } else if (seg.size === "medium") {
                  const post = seg.post;
                  result.push(
                    <div key={post.id} className="py-5" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                      <div className="flex gap-5">
                        {post.cover_image && (
                          <div className="relative shrink-0 overflow-hidden" style={{ width: "160px", aspectRatio: "16/9" }}>
                            <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="160px" />
                          </div>
                        )}
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <p className="text-sm uppercase tracking-widest opacity-50 mb-1" style={{ fontFamily: "var(--font-heading)" }}>{formatShortDate(post.created_at)}</p>
                          <Link href={`/blog/${post.slug}`} className="group">
                            <h3 className="font-bold leading-snug mb-2 group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem" }}>{post.title}</h3>
                          </Link>
                          {post.excerpt && <p className="leading-relaxed opacity-70 line-clamp-2" style={{ fontSize: "1rem" }}>{post.excerpt}</p>}
                        </div>
                      </div>
                    </div>
                  );
                } else if (seg.size === "small") {
                  const rows: typeof posts[] = [];
                  for (let r = 0; r < seg.posts.length; r += 3) rows.push(seg.posts.slice(r, r + 3));
                  rows.forEach((row, ri) => {
                    result.push(
                      <div key={`small-${si}-${ri}`} className="py-5" style={{ borderBottom: "1px solid rgba(58,53,48,0.15)" }}>
                        <div className="grid gap-0 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                          {row.map((post, pi) => (
                            <div key={post.id} className="py-4 sm:py-1 sm:px-4 sm:first:pl-0" style={pi < row.length - 1 ? { borderRight: "1px solid rgba(58,53,48,0.12)" } : {}}>
                              {post.cover_image && (
                                <div className="relative overflow-hidden mb-2 w-full" style={{ aspectRatio: "16/9" }}>
                                  <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                                </div>
                              )}
                              <p className="text-sm uppercase tracking-widest opacity-40 mb-1" style={{ fontFamily: "var(--font-heading)" }}>{formatShortDate(post.created_at)}</p>
                              <Link href={`/blog/${post.slug}`} className="group">
                                <h4 className="font-bold leading-snug group-hover:underline" style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem" }}>{post.title}</h4>
                              </Link>
                              {post.excerpt && <p className="opacity-60 mt-1 line-clamp-2 leading-relaxed" style={{ fontSize: "0.95rem" }}>{post.excerpt}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                }
                // Inject More Articles after segment index 2
                if (si === 2 && moreArticlesBlock) result.push(moreArticlesBlock);
              });

              return result;
            })()}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-12" style={{ borderTop: "3px double rgba(58,53,48,0.35)" }}>
                <div className="grid grid-cols-3 items-center pt-5">
                  <div className="flex justify-start">
                    {page > 1 ? (
                      <Link
                        href={`/?page=${page - 1}`}
                        className="flex flex-col items-start gap-1 hover:opacity-70 transition-opacity"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <span className="text-lg leading-none">←</span>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Turn Back</span>
                      </Link>
                    ) : <span />}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-heading)" }}>
                      {toRoman(page)}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] opacity-40" style={{ fontFamily: "var(--font-heading)" }}>
                      of {toRoman(totalPages)}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    {page < totalPages ? (
                      <Link
                        href={`/?page=${page + 1}`}
                        className="flex flex-col items-end gap-1 hover:opacity-70 transition-opacity"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <span className="text-lg leading-none">→</span>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Turn Forward</span>
                      </Link>
                    ) : <span />}
                  </div>
                </div>
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
