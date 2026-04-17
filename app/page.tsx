import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import NavUser from "@/components/NavUser";
import Link from "next/link";
import Image from "next/image";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function Home() {
  const [settings, supabase] = await Promise.all([
    getSiteSettings(),
    createClient(),
  ]);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, cover_image, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const lead = posts?.[0];
  const secondary = posts?.slice(1, 3) ?? [];
  const tertiary = posts?.slice(3, 7) ?? [];
  const sidebar = posts?.slice(7, 10) ?? [];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ color: "#3a3530" }}>

      {/* ── Masthead ───────────────────────────────────────────────── */}
      <header style={{ borderBottom: "3px double rgba(58,53,48,0.35)" }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-1.5 text-xs"
          style={{ borderBottom: "1px solid rgba(58,53,48,0.2)" }}
        >
          <span style={{ fontFamily: "var(--font-heading)" }}>{today}</span>
          <div className="flex items-center gap-6">
            <Link href="/blog" className="tracking-widest uppercase hover:underline">
              All Articles
            </Link>
            <NavUser />
          </div>
        </div>

        {/* Site name */}
        <div className="text-center py-6 px-6">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={settings.site_name}
              className="h-16 mx-auto object-contain"
            />
          ) : (
            <Link href="/">
              <h1
                className="text-6xl md:text-8xl font-bold uppercase tracking-tight leading-none"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {settings.site_name}
              </h1>
            </Link>
          )}
          <p
            className="text-xs tracking-[0.3em] uppercase mt-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ✦ {settings.site_tagline} ✦
          </p>
        </div>

        {/* Section nav */}
        <nav
          className="flex items-center justify-center gap-8 py-2 text-xs tracking-widest uppercase"
          style={{ borderTop: "1px solid rgba(58,53,48,0.2)", borderBottom: "1px solid rgba(58,53,48,0.2)", fontFamily: "var(--font-heading)" }}
        >
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/blog" className="hover:underline">Latest</Link>
        </nav>
      </header>

      {/* ── Front Page ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">

        {posts && posts.length === 0 && (
          <p className="text-center py-24 text-stone-400 tracking-widest uppercase text-sm">
            No articles published yet.
          </p>
        )}

        {lead && (
          <>
            {/* ── Row 1: Lead + Secondary ─────────────────────────── */}
            <div
              className="grid grid-cols-1 md:grid-cols-12 gap-0 mb-0"
              style={{ borderBottom: "1px solid rgba(58,53,48,0.2)" }}
            >
              {/* Lead story */}
              <div
                className="md:col-span-7 py-6 md:pr-6"
                style={{ borderRight: "1px solid rgba(58,53,48,0.2)" }}
              >
                {lead.cover_image && (
                  <div className="relative w-full mb-4 overflow-hidden" style={{ height: "340px" }}>
                    <Image
                      src={lead.cover_image}
                      alt={lead.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                )}
                <Link href={`/blog/${lead.slug}`} className="group">
                  <h2
                    className="text-4xl md:text-5xl font-bold leading-tight mb-3 group-hover:underline"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {lead.title}
                  </h2>
                </Link>
                {lead.excerpt && (
                  <p className="text-base leading-relaxed text-stone-700 mb-3 line-clamp-3">
                    {lead.excerpt}
                  </p>
                )}
                <p className="text-xs text-stone-400 uppercase tracking-widest">
                  {formatDate(lead.created_at)}
                </p>
              </div>

              {/* Secondary stories */}
              <div className="md:col-span-5 py-6 md:pl-6 flex flex-col gap-0">
                {secondary.map((post, i) => (
                  <div
                    key={post.id}
                    className="flex-1 pb-6 flex flex-col"
                    style={i < secondary.length - 1 ? { borderBottom: "1px solid rgba(58,53,48,0.15)", marginBottom: "1.5rem" } : {}}
                  >
                    {post.cover_image && (
                      <div className="relative w-full mb-3 overflow-hidden" style={{ height: "160px" }}>
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <Link href={`/blog/${post.slug}`} className="group">
                      <h3
                        className="text-xl md:text-2xl font-bold leading-snug mb-2 group-hover:underline"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {post.title}
                      </h3>
                    </Link>
                    {post.excerpt && (
                      <p className="text-sm leading-relaxed text-stone-600 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 uppercase tracking-widest mt-2">
                      {formatShortDate(post.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Row 2: Tertiary columns + Sidebar ───────────────── */}
            {(tertiary.length > 0 || sidebar.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 pt-6">

                {/* 4-column article strip */}
                <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-0"
                  style={{ borderRight: "1px solid rgba(58,53,48,0.2)" }}
                >
                  {tertiary.map((post, i) => (
                    <div
                      key={post.id}
                      className="px-4 first:pl-0 pb-6"
                      style={i < tertiary.length - 1 ? { borderRight: "1px solid rgba(58,53,48,0.15)" } : {}}
                    >
                      {post.cover_image && (
                        <div className="relative w-full mb-3 overflow-hidden" style={{ height: "110px" }}>
                          <Image
                            src={post.cover_image}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <Link href={`/blog/${post.slug}`} className="group">
                        <h4
                          className="text-base font-bold leading-snug mb-1.5 group-hover:underline"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {post.title}
                        </h4>
                      </Link>
                      {post.excerpt && (
                        <p className="text-xs leading-relaxed text-stone-500 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="text-xs text-stone-400 uppercase tracking-widest mt-2">
                        {formatShortDate(post.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Sidebar — popular / recent */}
                {sidebar.length > 0 && (
                  <div className="md:col-span-3 pl-0 md:pl-6 pt-6 md:pt-0">
                    <h5
                      className="text-xs font-bold uppercase tracking-widest pb-2 mb-4"
                      style={{ borderBottom: "2px solid rgba(58,53,48,0.25)", fontFamily: "var(--font-heading)" }}
                    >
                      ● More Articles
                    </h5>
                    <div className="flex flex-col gap-4">
                      {sidebar.map((post, i) => (
                        <div
                          key={post.id}
                          className="flex gap-3 pb-4"
                          style={i < sidebar.length - 1 ? { borderBottom: "1px solid rgba(58,53,48,0.12)" } : {}}
                        >
                          <span
                            className="text-2xl font-bold text-stone-200 leading-none shrink-0"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {i + 1}.
                          </span>
                          <div>
                            <Link href={`/blog/${post.slug}`} className="group">
                              <p
                                className="text-sm font-bold leading-snug group-hover:underline"
                                style={{ fontFamily: "var(--font-heading)" }}
                              >
                                {post.title}
                              </p>
                            </Link>
                            <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">
                              {formatShortDate(post.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="mt-8 py-6 px-6 text-center text-xs text-stone-400 tracking-widest uppercase"
        style={{ borderTop: "3px double rgba(58,53,48,0.35)", fontFamily: "var(--font-heading)" }}
      >
        {settings.site_name} &mdash; {settings.site_tagline}
      </footer>
    </div>
  );
}
