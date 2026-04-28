"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, List, ListOrdered, Link2, Unlink,
  Undo, Redo, Code2, ImagePlus, Loader2, X, Upload, Trash2,
} from "lucide-react";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data.url;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ src: string; preview: string } | null>(null);
  const [altText, setAltText] = useState("");
  const [imageOverlay, setImageOverlay] = useState<{ el: HTMLImageElement; rect: DOMRect } | null>(null);
  const [replacingImage, setReplacingImage] = useState(false);
  const [, setSelectionKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const imageOverlayRef = useRef<HTMLDivElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const replacingImageRef = useRef<HTMLImageElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "rich-link" },
      }),
      Image.configure({
        HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:0.5em;margin:1.5em 0;" },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      // Force re-render so toolbar buttons reflect the current selection
      setSelectionKey((k) => k + 1);
    },
    editorProps: {
      attributes: {
        class: "prose prose-zinc max-w-none outline-none min-h-[240px] sm:min-h-[360px] md:min-h-[480px]",
      },
    },
  });

  // Sync external content changes (e.g. from form reset)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    };
  }, [pendingImage]);

  // Close image overlay on outside click
  useEffect(() => {
    if (!imageOverlay) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (imageOverlayRef.current && !imageOverlayRef.current.contains(target) && target !== imageOverlay.el) {
        setImageOverlay(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [imageOverlay]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";
    const preview = URL.createObjectURL(file);
    setUploadingImage(true);
    try {
      let src: string;
      try { src = await uploadImage(file); }
      catch { src = await fileToBase64(file); }
      setPendingImage({ src, preview });
      setAltText("");
      setTimeout(() => altInputRef.current?.focus(), 50);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleConfirmInsert = () => {
    if (!pendingImage || !editor) return;
    editor.chain().focus().setImage({ src: pendingImage.src, alt: altText }).run();
    URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
    setAltText("");
  };

  const handleReplaceWithUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor || !imageOverlay) return;
    e.target.value = "";
    setReplacingImage(true);
    try {
      let src: string;
      try { src = await uploadImage(file); } catch { src = await fileToBase64(file); }
      let pos = -1;
      editor.state.doc.descendants((node, p) => {
        if (pos !== -1) return false;
        if (node.type.name === "image" && node.attrs.src === imageOverlay.el.src) { pos = p; }
      });
      if (pos >= 0) editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { src }).run();
    } catch { alert("Upload failed"); }
    setReplacingImage(false);
    setImageOverlay(null);
  };

  const handleRemoveImage = () => {
    if (!editor || !imageOverlay) return;
    let pos = -1;
    editor.state.doc.descendants((node, p) => {
      if (pos !== -1) return false;
      if (node.type.name === "image" && node.attrs.src === imageOverlay.el.src) { pos = p; }
    });
    if (pos >= 0) editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
    setImageOverlay(null);
  };

  const handleToggleLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      setShowLinkInput((v) => !v);
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  };

  const handleApplyLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = linkUrl.startsWith("http") || linkUrl.startsWith("/") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const isActive = (type: string, attrs?: Record<string, unknown>) =>
    editor?.isActive(type, attrs) ?? false;

  const tbBtn = (active: boolean, onMD: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onMD(); }}
      title={title}
      className={`w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900"
          : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
      }`}
    >
      {icon}
    </button>
  );

  const sep = (
    <div className="w-px h-6 sm:h-4 bg-stone-200 dark:bg-stone-700 mx-1 sm:mx-0.5 self-center" />
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Alt text dialog */}
      {pendingImage && (
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-4 flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage.preview} alt="preview" className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-stone-200 dark:border-stone-700" />
          <div className="flex-1 flex flex-col gap-2">
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Add alt text before inserting</p>
            <input
              ref={altInputRef}
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmInsert(); }}
              placeholder="Describe the image for accessibility…"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmInsert}
                className="rounded-full px-4 py-1.5 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80"
                style={{ background: "var(--color-accent)" }}
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => { URL.revokeObjectURL(pendingImage.preview); setPendingImage(null); setAltText(""); }}
                className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 dark:border-stone-700">
        {/* Toolbar */}
        <div className="sticky top-14 z-20 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 rounded-t-xl px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-0.5 flex-wrap">
          {tbBtn(isActive("paragraph"), () => editor?.chain().focus().setParagraph().run(), "Paragraph", <span className="text-[10px] font-bold leading-none">P</span>)}
          {tbBtn(isActive("heading", { level: 1 }), () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1", <span className="text-[10px] font-bold leading-none">H1</span>)}
          {tbBtn(isActive("heading", { level: 2 }), () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2", <span className="text-[10px] font-bold leading-none">H2</span>)}
          {tbBtn(isActive("heading", { level: 3 }), () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), "Heading 3", <span className="text-[10px] font-bold leading-none">H3</span>)}
          {sep}
          {tbBtn(isActive("bold"), () => editor?.chain().focus().toggleBold().run(), "Bold (Ctrl+B)", <Bold size={12} />)}
          {tbBtn(isActive("italic"), () => editor?.chain().focus().toggleItalic().run(), "Italic (Ctrl+I)", <Italic size={12} />)}
          {tbBtn(isActive("code"), () => editor?.chain().focus().toggleCode().run(), "Inline code", <Code2 size={12} />)}
          {tbBtn(isActive("blockquote"), () => editor?.chain().focus().toggleBlockquote().run(), "Blockquote", <span className="text-[10px] font-bold leading-none">"</span>)}
          {sep}
          {tbBtn(isActive("bulletList"), () => editor?.chain().focus().toggleBulletList().run(), "Bullet list", <List size={12} />)}
          {tbBtn(isActive("orderedList"), () => editor?.chain().focus().toggleOrderedList().run(), "Numbered list", <ListOrdered size={12} />)}
          {sep}
          <div className="relative">
            {tbBtn(isActive("link"), handleToggleLink, isActive("link") ? "Remove link" : "Add link (select text first)", <Link2 size={12} />)}
            {showLinkInput && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 flex items-center gap-1.5 z-20 shadow-xl w-48 sm:w-60">
                <input
                  ref={linkInputRef}
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyLink();
                    if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
                  }}
                  placeholder="/path or https://…"
                  className="flex-1 bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleApplyLink(); }}
                  className="text-xs font-medium flex-shrink-0 transition-colors"
                  style={{ color: "var(--color-accent)" }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          {tbBtn(false, () => editor?.chain().focus().unsetLink().run(), "Unlink", <Unlink size={12} />)}
          {sep}
          {tbBtn(false, () => editor?.chain().focus().undo().run(), "Undo (Ctrl+Z)", <Undo size={12} />)}
          {tbBtn(false, () => editor?.chain().focus().redo().run(), "Redo (Ctrl+Y)", <Redo size={12} />)}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <input ref={replaceFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceWithUpload} />

          {sep}
          {tbBtn(false, () => fileInputRef.current?.click(), "Insert image", uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />)}
        </div>

        {/* Editor area */}
        <div
          className="px-3 sm:px-6 pb-4 sm:pb-6 bg-white dark:bg-stone-900"
          onClick={(e) => {
            const img = (e.target as HTMLElement).closest("img") as HTMLImageElement | null;
            if (img) {
              e.preventDefault();
              setImageOverlay({ el: img, rect: img.getBoundingClientRect() });
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Image overlay controls */}
      {imageOverlay && (
        <div
          ref={imageOverlayRef}
          className="fixed z-[9999] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl flex items-center gap-0.5 p-1.5"
          style={{
            left: imageOverlay.rect.left,
            top: imageOverlay.rect.top - 48 > 0 ? imageOverlay.rect.top - 48 : imageOverlay.rect.bottom + 6,
          }}
        >
          <button
            type="button"
            onClick={() => replaceFileInputRef.current?.click()}
            disabled={replacingImage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {replacingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Replace
          </button>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
