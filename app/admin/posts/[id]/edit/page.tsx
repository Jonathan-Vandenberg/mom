import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PostEditor from "@/components/admin/PostEditor";
import { updatePost } from "@/actions/posts";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, content, excerpt, cover_image, author_name, meta_description, meta_keywords")
    .eq("id", id)
    .single();

  if (!post) {
    notFound();
  }

  const boundUpdatePost = updatePost.bind(null, post.id);

  return (
    <div>
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] uppercase mb-2 text-stone-400">
          Edit
        </p>
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-light text-stone-900"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {post.title}
        </h1>
      </div>
      <PostEditor
        action={boundUpdatePost}
        initialData={{
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          cover_image: post.cover_image,
          author_name: post.author_name || "",
          meta_description: post.meta_description || "",
          meta_keywords: post.meta_keywords || "",
        }}
      />
    </div>
  );
}
