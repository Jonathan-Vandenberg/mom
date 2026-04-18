"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }: { content: string }) {
  // TipTap produces HTML; legacy posts may be Markdown.
  // Detect HTML by checking for an opening tag at the start of content.
  const isHtml = /<(?:p|h[1-6]|div|ul|ol|article|section|blockquote)\b/i.test(content);

  if (isHtml) {
    // Strip a leading h2/h3 that just says "Introduction" (case-insensitive)
    const cleaned = content.replace(/^\s*<h[23][^>]*>\s*Introduction\s*<\/h[23]>\s*/i, "");
    return (
      <div
        className="prose prose-zinc max-w-none prose-dropcap"
        dangerouslySetInnerHTML={{ __html: cleaned }}
      />
    );
  }

  return (
    <div className="prose prose-zinc max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              className="rounded-lg max-w-full h-auto"
              loading="lazy"
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
