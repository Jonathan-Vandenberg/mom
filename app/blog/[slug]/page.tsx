import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSiteSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import MarkdownRenderer from "@/components/blog/MarkdownRenderer";
import NavUser from "@/components/NavUser";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
  const { data: posts } = await supabase
    .from("posts")
    .select("slug")
    .eq("published", true);

  return (posts ?? []).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) return { title: "Not Found" };

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [settings, supabase] = await Promise.all([
    getSiteSettings(),
    createClient(),
  ]);

  const { data: post } = await supabase
    .from("posts")
    .select("title, content, cover_image, created_at, excerpt")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl tracking-widest uppercase font-light text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.site_name}
          </Link>
          <Link
            href="/blog"
            className="text-sm tracking-wider uppercase text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            ← Articles
          </Link>
          <NavUser />
        </div>
      </header>

      <article className="flex-1">
        {/* Hero */}
        {post.cover_image ? (
          <div className="relative h-[55vh] w-full overflow-hidden">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
            <div className="absolute bottom-0 left-0 right-0 px-6 py-12 text-center">
              <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-4">
                {date}
              </p>
              <h1
                className="text-4xl sm:text-6xl font-light text-white max-w-4xl mx-auto leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {post.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="pt-16 pb-12 px-6 text-center border-b border-stone-100 dark:border-stone-800">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 text-stone-400 dark:text-stone-500">
              {date}
            </p>
            <h1
              className="text-4xl sm:text-6xl font-light text-stone-900 dark:text-stone-100 max-w-4xl mx-auto leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-6 text-lg text-stone-500 dark:text-stone-400 font-light max-w-2xl mx-auto leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 py-16">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link
            href="/blog"
            className="text-sm tracking-wider uppercase text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            ← All Articles
          </Link>
          <span
            className="text-sm tracking-widest uppercase font-light text-stone-400 dark:text-stone-500"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {settings.site_name}
          </span>
        </div>
      </footer>
    </div>
  );
}
