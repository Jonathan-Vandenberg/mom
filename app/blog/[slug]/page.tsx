import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSiteSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import MarkdownRenderer from "@/components/blog/MarkdownRenderer";
import ShareButtons from "@/components/blog/ShareButtons";
import ArticleNav from "@/components/blog/ArticleNav";
import NavUser from "@/components/NavUser";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return [];

  const supabase = createSupabaseClient(url, key);
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
  const [supabase, settings] = await Promise.all([createClient(), getSiteSettings()]);
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image, author_name, meta_description, meta_keywords, created_at")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) return { title: "Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const canonicalUrl = `${siteUrl}/blog/${slug}`;
  const description = post.meta_description || post.excerpt || undefined;
  const keywords = post.meta_keywords || undefined;
  const author = post.author_name || "Jonathan van den Berg";
  const images = post.cover_image
    ? [{ url: post.cover_image, width: 1200, height: 630, alt: post.title }]
    : [];

  return {
    title: post.title,
    description,
    keywords,
    authors: [{ name: author }],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: canonicalUrl,
      siteName: settings.site_name,
      authors: [author],
      publishedTime: post.created_at,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
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
    .select("title, content, cover_image, created_at, excerpt, author_name")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt && { description: post.excerpt }),
    ...(post.cover_image && { image: post.cover_image }),
    datePublished: post.created_at,
    ...(post.author_name && {
      author: { "@type": "Person", name: post.author_name },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Nav — fixed, hides on scroll down */}
      <ArticleNav siteName={settings.site_name} logoUrl={settings.logo_url} userSlot={<NavUser />} />

      <article className="flex-1 pt-[72px]">
        {/* Hero — pt-[72px] clears the fixed nav */}
        {post.cover_image && (
          <div className="relative h-[35vh] sm:h-[45vh] md:h-[55vh] w-full overflow-hidden">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover object-top"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 text-center border-b border-stone-100 dark:border-stone-800">
          <p className="text-xs tracking-[0.3em] uppercase mb-4 text-stone-400 dark:text-stone-500">
            {post.author_name && <>{post.author_name} · </>}{date}
          </p>
          <h1
            className="text-2xl sm:text-4xl md:text-6xl font-light text-stone-900 dark:text-stone-100 max-w-4xl mx-auto leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-stone-500 dark:text-stone-400 font-light max-w-2xl mx-auto leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
          <MarkdownRenderer content={post.content} />
          <ShareButtons
            title={post.title}
            url={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/blog/${slug}`}
          />
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/"
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
