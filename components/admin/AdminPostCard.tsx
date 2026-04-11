"use client";

import { useState } from "react";
import Link from "next/link";
import ConfirmModal from "./ConfirmModal";

interface AdminPostCardProps {
  id: string;
  title: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  togglePublishAction: (id: string, published: boolean) => Promise<void>;
  deletePostAction: (id: string) => Promise<void>;
}

export default function AdminPostCard({
  id,
  title,
  excerpt,
  published,
  created_at,
  togglePublishAction,
  deletePostAction,
}: AdminPostCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const date = new Date(created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePostAction(id);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-5 py-4 group hover:border-stone-200 dark:hover:border-stone-700 transition-colors">
        {/* Title row */}
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-1.5">
          <h2
            className="text-base sm:text-lg font-medium text-stone-900 dark:text-stone-100 leading-snug flex-1 min-w-0"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs tracking-wider flex-shrink-0 ${
              published
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
            }`}
          >
            {published ? "Published" : "Draft"}
          </span>
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-sm text-stone-400 dark:text-stone-500 leading-relaxed line-clamp-2 mb-1.5">
            {excerpt}
          </p>
        )}

        {/* Date */}
        <p className="text-xs text-stone-300 dark:text-stone-600 tracking-wider mb-3">
          {date}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <form action={() => togglePublishAction(id, !published)}>
            <button
              type="submit"
              className="rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs tracking-wider text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
            >
              {published ? "Unpublish" : "Publish"}
            </button>
          </form>
          <Link
            href={`/admin/posts/${id}/edit`}
            className="rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs tracking-wider text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-full border border-rose-100 dark:border-rose-900 px-3 py-1 text-xs tracking-wider text-rose-400 dark:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Post"
        message={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
