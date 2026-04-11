"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });
const AIArticleWriter = dynamic(() => import("./AIArticleWriter"), { ssr: false });

interface PostEditorProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string; success?: string } | void>;
  initialData?: {
    title: string;
    content: string;
    excerpt: string;
    cover_image: string;
    author_name: string;
    meta_description: string;
    meta_keywords: string;
  };
}

const inputClass =
  "block w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-stone-900 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors";

const labelClass =
  "block text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-2";

export default function PostEditor({ action, initialData }: PostEditorProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [content, setContent] = useState(initialData?.content ?? "");
  const [coverImage, setCoverImage] = useState(initialData?.cover_image ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(`Upload failed: ${data.error || res.statusText}`);
        return;
      }
      if (data.url) setCoverImage(data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-7 max-w-5xl">

      {/* Title */}
      <div>
        <label className={labelClass}>Title</label>
        <input
          name="title"
          type="text"
          required
          defaultValue={initialData?.title ?? ""}
          className="block w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 text-xl font-light placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
          style={{ fontFamily: "var(--font-heading)" }}
          placeholder="Post title"
        />
      </div>

      {/* Author */}
      <div>
        <label className={labelClass}>Author</label>
        <input
          name="author_name"
          type="text"
          defaultValue={initialData?.author_name ?? ""}
          className={inputClass}
          placeholder="Author name"
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className={labelClass}>Excerpt</label>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={initialData?.excerpt ?? ""}
          className={inputClass}
          placeholder="A short description shown in listings"
        />
      </div>

      {/* Cover Image */}
      <div>
        <label className={labelClass}>Cover Image</label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverImageUpload}
            className="block w-full text-sm text-stone-400 dark:text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-stone-200 dark:file:border-stone-700 file:text-xs file:tracking-widest file:uppercase file:text-stone-500 dark:file:text-stone-400 file:bg-transparent hover:file:border-stone-400 dark:hover:file:border-stone-500 file:cursor-pointer file:transition-colors"
          />
          {uploading && (
            <span className="text-xs text-stone-400 dark:text-stone-500 tracking-wider whitespace-nowrap">Uploading…</span>
          )}
        </div>
        {coverImage && (
          <div className="mt-3 relative h-40 w-full overflow-hidden rounded-xl border border-stone-100 dark:border-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="Cover preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverImage("")}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <input type="hidden" name="cover_image" value={coverImage} />
      </div>

      {/* AI Article Writer */}
      <div>
        <AIArticleWriter
          onInsert={(html) => setContent((prev) => (prev ? prev + html : html))}
        />
      </div>

      {/* Content */}
      <div>
        <label className={labelClass}>Content</label>
        <RichEditor content={content} onChange={setContent} />
        <input type="hidden" name="content" value={content} />
      </div>

      {/* SEO */}
      <details className="group">
        <summary className="cursor-pointer text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 flex items-center gap-2">
          <span>SEO Settings</span>
          <span className="text-[10px] text-stone-300 dark:text-stone-600 group-open:hidden">▶</span>
          <span className="text-[10px] text-stone-300 dark:text-stone-600 hidden group-open:inline">▼</span>
        </summary>
        <div className="mt-4 space-y-5">
          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea
              name="meta_description"
              rows={2}
              defaultValue={initialData?.meta_description ?? ""}
              className={inputClass}
              placeholder="SEO description (recommended 150-160 characters)"
              maxLength={320}
            />
          </div>
          <div>
            <label className={labelClass}>Meta Keywords</label>
            <input
              name="meta_keywords"
              type="text"
              defaultValue={initialData?.meta_keywords ?? ""}
              className={inputClass}
              placeholder="Comma-separated keywords (e.g. gemstones, healing, crystals)"
            />
          </div>
        </div>
      </details>

      {state?.error && (
        <p className="text-sm text-rose-500">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          name="published"
          value="false"
          disabled={pending}
          className="rounded-full border border-stone-200 dark:border-stone-700 px-6 py-2 text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          name="published"
          value="true"
          disabled={pending}
          className="rounded-full px-6 py-2 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          {pending ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
