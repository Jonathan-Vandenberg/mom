import Link from "next/link";
import Image from "next/image";

interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  created_at: string;
}

export default function PostCard({
  title,
  slug,
  excerpt,
  cover_image,
  created_at,
}: PostCardProps) {
  const date = new Date(created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="relative h-52 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        {cover_image ? (
          <Image
            src={cover_image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(circle at center, var(--color-accent), transparent 70%)",
            }}
          />
        )}
      </div>
      <div className="flex flex-col flex-1 p-6">
        <p className="text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-3">
          {date}
        </p>
        <h2
          className="text-xl font-light text-stone-900 dark:text-stone-100 leading-snug mb-3 group-hover:opacity-70 transition-opacity"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h2>
        {excerpt && (
          <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed flex-1">
            {excerpt}
          </p>
        )}
        <span
          className="mt-4 text-xs tracking-widest uppercase font-medium transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Read Article →
        </span>
      </div>
    </Link>
  );
}
