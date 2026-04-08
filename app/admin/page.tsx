import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { deletePost, togglePublish } from "@/actions/posts";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, published, created_at, excerpt")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase mb-2 text-stone-400 dark:text-stone-500">
            Manage
          </p>
          <h1
            className="text-4xl font-light text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Posts
          </h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80"
          style={{ background: "var(--color-accent)" }}
        >
          + New Post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-stone-200 dark:border-stone-700 rounded-2xl">
          <p className="text-stone-400 dark:text-stone-500 text-sm tracking-wide mb-4">
            No posts yet
          </p>
          <Link
            href="/admin/posts/new"
            className="text-xs tracking-widest uppercase transition-colors"
            style={{ color: "var(--color-accent)" }}
          >
            Write your first post →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 group hover:border-stone-200 dark:hover:border-stone-700 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2
                    className="text-base font-light text-stone-900 dark:text-stone-100 truncate"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {post.title}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs tracking-wider ${
                      post.published
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
                {post.excerpt && (
                  <p className="text-sm text-stone-400 dark:text-stone-500 truncate leading-relaxed">
                    {post.excerpt}
                  </p>
                )}
                <p className="mt-1 text-xs text-stone-300 dark:text-stone-600 tracking-wider">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="ml-6 flex items-center gap-2 flex-shrink-0">
                <form action={togglePublish.bind(null, post.id, !post.published)}>
                  <button
                    type="submit"
                    className="rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs tracking-wider text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                  >
                    {post.published ? "Unpublish" : "Publish"}
                  </button>
                </form>
                <Link
                  href={`/admin/posts/${post.id}/edit`}
                  className="rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs tracking-wider text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                >
                  Edit
                </Link>
                <form action={deletePost.bind(null, post.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-rose-100 dark:border-rose-900 px-3 py-1 text-xs tracking-wider text-rose-400 dark:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
