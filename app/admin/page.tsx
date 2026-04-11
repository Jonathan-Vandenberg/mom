import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { deletePost, togglePublish } from "@/actions/posts";
import AdminPostCard from "@/components/admin/AdminPostCard";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, published, created_at, excerpt")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase mb-2 text-stone-400 dark:text-stone-500">
            Manage
          </p>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-light text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Posts
          </h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80 self-start sm:self-auto"
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
            <AdminPostCard
              key={post.id}
              id={post.id}
              title={post.title}
              excerpt={post.excerpt}
              published={post.published}
              created_at={post.created_at}
              togglePublishAction={togglePublish}
              deletePostAction={deletePost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
