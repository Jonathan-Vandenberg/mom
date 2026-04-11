import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import PostCard from "@/components/blog/PostCard";
import NavUser from "@/components/NavUser";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Articles",
    description: settings.site_tagline,
  };
}

export default async function BlogPage() {
  const [settings, supabase] = await Promise.all([
    getSiteSettings(),
    createClient(),
  ]);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, cover_image, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl tracking-widest uppercase font-light text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt={settings.site_name} className="h-10 w-auto object-contain" />
            )}
            {settings.site_name}
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm tracking-wider uppercase"
              style={{ color: "var(--color-accent)" }}
            >
              Articles
            </Link>
            <NavUser />
          </nav>
        </div>
      </header>

      {/* Page header */}
      <div className="py-20 px-6 text-center border-b border-stone-100 dark:border-stone-800">
        <p
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{ color: "var(--color-accent)" }}
        >
          {settings.site_tagline}
        </p>
        <h1
          className="text-5xl font-light text-stone-900 dark:text-stone-100"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Articles
        </h1>
      </div>

      {/* Posts */}
      <main className="flex-1 py-16 px-6">
        <div className="mx-auto max-w-6xl">
          {!posts || posts.length === 0 ? (
            <p className="text-center text-stone-400 dark:text-stone-500 py-20">
              No articles published yet.
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs text-stone-400 dark:text-stone-500 tracking-wider">
            {settings.site_name} — {settings.site_tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
