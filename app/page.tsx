import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import PostCard from "@/components/blog/PostCard";
import NavUser from "@/components/NavUser";
import Link from "next/link";
import Image from "next/image";

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
    .limit(6);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-white text-xl tracking-widest uppercase font-light"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.site_name}
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href="/blog"
              className="text-white/80 hover:text-white text-sm tracking-wider uppercase transition-colors"
            >
              Articles
            </Link>
            <NavUser dark />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-[92vh] overflow-hidden">
        {settings.hero_image ? (
          <Image
            src={settings.hero_image}
            alt={settings.hero_title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #1a0533 0%, #2d1b69 40%, #0f172a 100%)",
            }}
          />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Decorative orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "var(--color-accent)" }}
        />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-white/60 tracking-[0.3em] uppercase text-xs mb-6">
            {settings.site_tagline}
          </p>
          <h1
            className="text-5xl sm:text-7xl font-light text-white leading-tight mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.hero_title}
          </h1>
          <p className="text-white/70 text-lg sm:text-xl font-light max-w-2xl mx-auto leading-relaxed mb-12">
            {settings.hero_subtitle}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 border border-white/40 text-white px-8 py-3 rounded-full text-sm tracking-widest uppercase hover:bg-white/10 transition-all duration-300"
          >
            Explore Articles
          </Link>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* Latest Articles */}
      {posts && posts.length > 0 && (
        <section className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase mb-3"
                  style={{ color: "var(--color-accent)" }}>
                  Latest
                </p>
                <h2
                  className="text-4xl font-light text-stone-900 dark:text-stone-100"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Sacred Readings
                </h2>
              </div>
              <Link
                href="/blog"
                className="text-sm tracking-wider uppercase border-b pb-0.5 transition-colors text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                style={{ borderColor: "var(--color-accent)" }}
              >
                All Articles →
              </Link>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="text-lg tracking-widest uppercase font-light text-stone-600 dark:text-stone-400"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.site_name}
          </span>
          <p className="text-xs text-stone-400 dark:text-stone-500 tracking-wider">
            {settings.site_tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
