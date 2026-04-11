import PostEditor from "@/components/admin/PostEditor";
import { createPost } from "@/actions/posts";

export default function NewPostPage() {
  return (
    <div>
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] uppercase mb-2 text-stone-400">
          Create
        </p>
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-light text-stone-900"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          New Post
        </h1>
      </div>
      <PostEditor action={createPost} />
    </div>
  );
}
