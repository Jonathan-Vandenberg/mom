"use client";

import { useState } from "react";

interface FactCheckButtonProps {
  postId: string;
}

type Status = "idle" | "checking" | "done" | "error";

export default function FactCheckButton({ postId }: FactCheckButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ issuesFound: boolean; summary: string } | null>(null);

  async function handleFactCheck() {
    setStatus("checking");
    setResult(null);
    try {
      const res = await fetch(`/api/admin/fact-check/${postId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setResult({ issuesFound: false, summary: data.error || "Fact-check failed" });
        return;
      }
      setStatus("done");
      setResult({ issuesFound: data.issuesFound, summary: data.summary });
    } catch {
      setStatus("error");
      setResult({ issuesFound: false, summary: "Network error — please try again" });
    }
  }

  const badge =
    status === "error"
      ? "border-rose-300 text-rose-600 bg-rose-50"
      : result?.issuesFound
      ? "border-amber-300 text-amber-700 bg-amber-50"
      : "border-emerald-300 text-emerald-700 bg-emerald-50";

  const icon =
    status === "error" ? "✕" : result?.issuesFound ? "⚠" : "✓";

  return (
    <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
      <p className="text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-3"
        style={{ fontFamily: "var(--font-heading)" }}>
        Fact Check
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={handleFactCheck}
          disabled={status === "checking"}
          className="rounded-full border border-stone-300 dark:border-stone-600 px-6 py-2 text-xs tracking-widest uppercase text-stone-600 dark:text-stone-300 hover:border-stone-500 dark:hover:border-stone-400 transition-colors disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {status === "checking" ? "Checking facts…" : "✓ Run Fact Check"}
        </button>

        {result && (
          <span className={`text-xs tracking-wide px-4 py-2 rounded-full border ${badge}`}>
            {icon} {result.summary}
            {result.issuesFound && status === "done" && " — content updated"}
          </span>
        )}
      </div>
      {result?.issuesFound && status === "done" && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-500 tracking-wide">
          The article content has been updated with corrections. Refresh the editor to see the changes.
        </p>
      )}
    </div>
  );
}
