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
    day: "numeric", month: "short", year: "numeric",
  });
}

const POSTS_PER_PAGE = 16;
const FONT_H = "var(--font-heading)";
const BORDER_COLOR = "rgba(58,53,48,0.2)";
const BORDER_HEAVY = "3px double rgba(58,53,48,0.35)";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (page - 1) * POSTS_PER_PAGE;
  const to   = from + POSTS_PER_PAGE - 1;

  const [settings, supabase] = await Promise.all([getSiteSettings(), createClient()]);

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

  const p = posts ?? [];

  const hero       = p[0];
  const shoulder   = p.slice(1, 3);
  const digest     = p.slice(3, 9);
  const midBand    = p.slice(9, 13);
  const bottomPair = p.slice(13, 15);

  const rule = { borderColor: BORDER_COLOR };

  return (
    <div className="min-h-screen" style={{ color: "#2a2520", background: "#f5f0e8" }}>

      {/* ══ MASTHEAD ══ */}
      <header>
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-1 border-b"
          style={{ ...rule, fontSize: "0.7rem", fontFamily: FONT_H, letterSpacing: "0.08em" }}
        >
          <span className="opacity-60 text-[0.65rem] sm:text-[0.7rem] truncate pr-2">{today}</span>
          <NavUser />
          <span className="opacity-60 hidden md:block shrink-0 pl-2">Vol. {toRoman(page)} &nbsp;·&nbsp; Est. MMXXVI</span>
        </div>

        <div className="text-center border-b px-4" style={{ ...rule, padding: "1rem 1rem 0.75rem" }}>
          <div className="flex items-center gap-3 justify-center mb-3">
            <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.3)" }} />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.4em", fontFamily: FONT_H, opacity: 0.5 }}>✦ ✦ ✦</span>
            <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.3)" }} />
          </div>

          <Link href="/">
            <h1
              className="hover:opacity-75 transition-opacity uppercase"
              style={{
                fontFamily: FONT_H,
                fontWeight: 900,
                fontSize: "clamp(2.2rem, 8vw, 7rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.02em",
              }}
            >
              {settings.site_name}
            </h1>
          </Link>

          <p className="mt-2 uppercase opacity-50" style={{ fontSize: "0.6rem", letterSpacing: "0.3em", fontFamily: FONT_H }}>
            ✦ &thinsp; {settings.site_tagline} &thinsp; ✦
          </p>

          <div className="mt-3" style={{ borderTop: BORDER_HEAVY }} />
        </div>

        {totalPages > 1 && (
          <div className="text-center py-1 border-b uppercase opacity-45" style={{ ...rule, fontSize: "0.65rem", letterSpacing: "0.25em", fontFamily: FONT_H }}>
            Page {page} of {totalPages} &nbsp;·&nbsp; {count} Articles
          </div>
        )}

        <BreakingNewsTicker />
      </header>

      {/* ══ CONTENT ══ */}
      <main className="px-3 sm:px-5 lg:px-6">
        {p.length === 0 ? (
          <p className="text-center py-24 uppercase opacity-40" style={{ fontFamily: FONT_H, fontSize: "0.75rem", letterSpacing: "0.3em" }}>
            No articles published yet.
          </p>
        ) : (
          <>
            {/* ══ ZONE 1: Hero + Shoulder + Digest ══
                Mobile:  stack vertically
                md:      hero | (shoulder+digest) two-col
                lg:      hero | shoulder | digest three-col
            */}
            {hero && (
              <div className="border-b" style={rule}>
                <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.4fr_1.2fr]">

                  {/* ── HERO ── */}
                  <div
                    className="py-5 border-b lg:border-b-0 lg:border-r lg:pr-6"
                    style={rule}
                  >
                    {hero.cover_image && (
                      <div className="relative w-full overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
                        <Image
                          src={hero.cover_image}
                          alt={hero.title}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width:1024px) 100vw, 55vw"
                          priority
                        />
                      </div>
                    )}
                    <p className="uppercase opacity-45 mb-2" style={{ fontSize: "0.6rem", letterSpacing: "0.35em", fontFamily: FONT_H }}>
                      ● Top Story &nbsp;·&nbsp; {formatShortDate(hero.created_at)}
                    </p>
                    <Link href={`/blog/${hero.slug}`} className="group">
                      <h2
                        className="group-hover:underline mb-3"
                        style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.5rem)", lineHeight: 1.06, letterSpacing: "-0.01em" }}
                      >
                        {hero.title}
                      </h2>
                    </Link>
                    {hero.excerpt && (
                      <p className="mb-4 opacity-72" style={{ fontFamily: FONT_H, fontSize: "1.05rem", lineHeight: 1.6, fontStyle: "italic" }}>
                        {hero.excerpt}
                      </p>
                    )}
                    <Link
                      href={`/blog/${hero.slug}`}
                      className="underline underline-offset-2"
                      style={{ fontSize: "0.65rem", letterSpacing: "0.25em", fontFamily: FONT_H, textTransform: "uppercase", color: "var(--color-accent)" }}
                    >
                      Continue Reading →
                    </Link>
                  </div>

                  {/* ── SHOULDER + DIGEST stacked on tablet, side-by-side on lg ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 lg:contents">

                    {/* SHOULDER */}
                    <div
                      className="border-b md:border-b-0 md:border-r lg:border-b-0 lg:border-r lg:flex lg:flex-col"
                      style={rule}
                    >
                      {shoulder.map((post, i) => (
                        <div
                          key={post.id}
                          className="flex flex-col py-4 lg:px-5 lg:flex-1"
                          style={{ borderBottom: i < shoulder.length - 1 ? `1px solid ${BORDER_COLOR}` : undefined }}
                        >
                          {post.cover_image && (
                            <div className="relative w-full overflow-hidden mb-3" style={{ aspectRatio: "16/9" }}>
                              <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 50vw, 20vw" />
                            </div>
                          )}
                          <p className="uppercase opacity-40 mb-1" style={{ fontSize: "0.58rem", letterSpacing: "0.3em", fontFamily: FONT_H }}>
                            {formatShortDate(post.created_at)}
                          </p>
                          <Link href={`/blog/${post.slug}`} className="group">
                            <h3
                              className="group-hover:underline mb-2"
                              style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.2 }}
                            >
                              {post.title}
                            </h3>
                          </Link>
                          {post.excerpt && (
                            <p className="opacity-65 line-clamp-3" style={{ fontSize: "0.8rem", lineHeight: 1.55 }}>
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* DIGEST */}
                    <div className="py-5 lg:pl-5 lg:pr-0">
                      <p className="uppercase opacity-45 pb-2 mb-3 border-b" style={{ ...rule, fontSize: "0.6rem", letterSpacing: "0.3em", fontFamily: FONT_H }}>
                        ● Recently
                      </p>
                      <div>
                        {digest.map((post, i) => (
                          <div
                            key={post.id}
                            className="border-b last:border-b-0"
                            style={{ ...rule, paddingBottom: "0.75rem", marginBottom: "0.75rem" }}
                          >
                            <p className="uppercase opacity-35 mb-1" style={{ fontSize: "0.55rem", letterSpacing: "0.22em", fontFamily: FONT_H }}>
                              {formatShortDate(post.created_at)}
                            </p>
                            <Link href={`/blog/${post.slug}`} className="group">
                              <h4
                                className="group-hover:underline"
                                style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: "1rem", lineHeight: 1.25 }}
                              >
                                {post.title}
                              </h4>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ── Divider ── */}
            {midBand.length > 0 && (
              <div className="flex items-center py-2 border-b" style={rule}>
                <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.15)" }} />
                <span className="px-4 uppercase opacity-40" style={{ fontSize: "0.6rem", letterSpacing: "0.4em", fontFamily: FONT_H }}>
                  ✦ &thinsp; More Reports &thinsp; ✦
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.15)" }} />
              </div>
            )}

            {/* ══ ZONE 2: Mid-band — 1 col → 2 col → 4 col ══ */}
            {midBand.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b" style={rule}>
                {midBand.map((post, i) => (
                  <div
                    key={post.id}
                    className="flex flex-col border-b sm:border-b-0 sm:border-r last:border-r-0 py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0"
                    style={rule}
                  >
                    {post.cover_image && (
                      <div className="relative w-full overflow-hidden mb-3" style={{ aspectRatio: "3/2" }}>
                        <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" />
                      </div>
                    )}
                    <p className="uppercase opacity-38 mb-1" style={{ fontSize: "0.58rem", letterSpacing: "0.28em", fontFamily: FONT_H }}>
                      {formatShortDate(post.created_at)}
                    </p>
                    <Link href={`/blog/${post.slug}`} className="group">
                      <h3
                        className="group-hover:underline mb-2"
                        style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}
                      >
                        {post.title}
                      </h3>
                    </Link>
                    {post.excerpt && (
                      <p className="opacity-60 line-clamp-3" style={{ fontSize: "0.78rem", lineHeight: 1.55 }}>
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Divider ── */}
            {bottomPair.length > 0 && (
              <div className="flex items-center py-2 border-b" style={rule}>
                <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.15)" }} />
                <span className="px-4 uppercase opacity-40" style={{ fontSize: "0.6rem", letterSpacing: "0.4em", fontFamily: FONT_H }}>
                  ✦ &thinsp; Late Edition &thinsp; ✦
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(58,53,48,0.15)" }} />
              </div>
            )}

            {/* ══ ZONE 3: Late Edition — 1 col → 2 col ══ */}
            {bottomPair.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 border-b" style={rule}>
                {bottomPair.map((post, i) => (
                  <div
                    key={post.id}
                    className="border-b md:border-b-0 md:border-r last:border-r-0 py-4 md:px-4 md:first:pl-0 md:last:pr-0"
                    style={rule}
                  >
                    {/* Mobile: image on top full width; md+: image left, text right */}
                    <div className="flex flex-col md:flex-row gap-4 md:items-start">
                      {post.cover_image && (
                        <div
                          className="relative w-full md:w-[220px] md:shrink-0 overflow-hidden"
                          style={{ aspectRatio: "16/9" }}
                        >
                          <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 220px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="uppercase opacity-38 mb-1" style={{ fontSize: "0.58rem", letterSpacing: "0.28em", fontFamily: FONT_H }}>
                          {formatShortDate(post.created_at)}
                        </p>
                        <Link href={`/blog/${post.slug}`} className="group">
                          <h3
                            className="group-hover:underline mb-2"
                            style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 }}
                          >
                            {post.title}
                          </h3>
                        </Link>
                        {post.excerpt && (
                          <p className="opacity-60 line-clamp-3" style={{ fontSize: "0.8rem", lineHeight: 1.55 }}>
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-10" style={{ borderTop: BORDER_HEAVY }}>
                <div className="grid grid-cols-3 items-center pt-5">
                  <div>
                    {page > 1 && (
                      <Link
                        href={`/?page=${page - 1}`}
                        className="flex flex-col gap-1 opacity-70 hover:opacity-100 transition-opacity"
                        style={{ fontFamily: FONT_H }}
                      >
                        <span className="text-xl leading-none">←</span>
                        <span className="uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}>Turn Back</span>
                      </Link>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-bold" style={{ fontFamily: FONT_H, fontSize: "2.5rem", lineHeight: 1 }}>{toRoman(page)}</div>
                    <div className="uppercase opacity-35" style={{ fontSize: "0.55rem", letterSpacing: "0.25em", fontFamily: FONT_H }}>of {toRoman(totalPages)}</div>
                  </div>
                  <div className="flex justify-end">
                    {page < totalPages && (
                      <Link
                        href={`/?page=${page + 1}`}
                        className="flex flex-col items-end gap-1 opacity-70 hover:opacity-100 transition-opacity"
                        style={{ fontFamily: FONT_H }}
                      >
                        <span className="text-xl leading-none">→</span>
                        <span className="uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}>Turn Forward</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="mt-10 text-center uppercase opacity-40"
        style={{ borderTop: BORDER_HEAVY, padding: "1.25rem 1.5rem", fontSize: "0.6rem", letterSpacing: "0.3em", fontFamily: FONT_H }}
      >
        {settings.site_name} &mdash; {settings.site_tagline}
      </footer>
    </div>
  );
}
