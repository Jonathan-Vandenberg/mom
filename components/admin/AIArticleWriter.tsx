"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles, Send, Loader2, ChevronDown, Check, X, FileText, Copy, ImageIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ── Types ─────────────────────────────────────────────────── */

interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: { prompt: string; completion: string };
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIArticleWriterProps {
  onInsert: (html: string) => void;
}

/* ── Helpers ───────────────────────────────────────────────── */

function isModelFree(m: OpenRouterModel): boolean {
  if (!m.pricing) return false;
  const p = m.pricing.prompt?.toLowerCase().trim() || "0";
  const c = m.pricing.completion?.toLowerCase().trim() || "0";
  if (p === "free" || c === "free") return true;
  const pn = parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
  const cn = parseFloat(c.replace(/[^0-9.]/g, "")) || 0;
  return pn === 0 && cn === 0;
}

function getSystemPrompt() {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const year = new Date().getFullYear();
  return `You are a professional article writer and editor. Help the user plan and write articles.

IMPORTANT: Today's date is ${today}. The current year is ${year}. Always use this as context for current events, projections, and timelines.

When the user describes what they want to write about, respond with a brief acknowledgement (1-2 sentences) followed by planning questions in this EXACT JSON format:

\`\`\`questions
[
  {"question": "What tone should the article have?", "options": ["Professional & authoritative", "Casual & conversational", "Educational & informative", "Inspirational & motivational"]},
  {"question": "How long should the article be?", "options": ["Short (~500 words)", "Medium (~1000 words)", "Long (~2000 words)", "Comprehensive (~3000+ words)"]},
  {"question": "Who is the target audience?", "options": ["General public", "Beginners in the topic", "Enthusiasts & hobbyists", "Industry professionals"]}
]
\`\`\`

IMPORTANT rules for questions:
- Always include 3-6 questions relevant to the user's topic
- Each question must have exactly 3-4 options
- Make questions specific to the topic the user described
- The questions block must be valid JSON wrapped in \`\`\`questions ... \`\`\`

After the user answers all questions and provides any additional notes, create a detailed article plan/outline. Present it clearly, then ask if they'd like any changes.

Once the plan is approved, write the full article in Markdown format:
- Use proper Markdown formatting (## for headings, - for lists, **bold**, *italic*)
- Write engaging, well-structured content
- Include an introduction and conclusion
- You MUST include images by using this special placeholder syntax:
  [GENERATE_IMAGE: detailed description of the image you want]
  For example: [GENERATE_IMAGE: A close-up photograph of a purple amethyst crystal on a dark stone surface, soft lighting]
  Include 2-4 image placeholders in longer articles. IMPORTANT: Place each image placeholder INLINE within the article body, between relevant sections or after key paragraphs — NOT grouped at the end. Each image should visually complement the section it follows.
- When you output the final article, wrap it in a code block with the language "article" like this:

\`\`\`article
## Title Here
Content here...

[GENERATE_IMAGE: description of relevant image]

More content...
\`\`\`

This allows the user to easily insert it into the editor. Image placeholders will be replaced with AI-generated images.`;
}

/* ── Question types ────────────────────────────────────────── */

interface PlanQuestion {
  question: string;
  options: string[];
}

interface QuestionFlowState {
  questions: PlanQuestion[];
  currentIndex: number;
  answers: { question: string; answer: string }[];
  showFinalInput: boolean;
  finalNote: string;
}

/* ── Component ─────────────────────────────────────────────── */

export default function AIArticleWriter({ onInsert }: AIArticleWriterProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("x-ai/grok-4.20");
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState("");
  const [questionFlow, setQuestionFlow] = useState<QuestionFlowState | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const modelSearchRef = useRef<HTMLInputElement>(null);
  const finalNoteRef = useRef<HTMLTextAreaElement>(null);

  // Fetch models on first open
  useEffect(() => {
    if (!open || models.length > 0) return;
    setLoadingModels(true);
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((d) => {
        const list: OpenRouterModel[] = d.models || [];
        setModels(list);
        // Keep default (Grok 4.20) if it exists in the list, otherwise fall back
        const hasDefault = list.some((m) => m.id === "x-ai/grok-4.20");
        if (!hasDefault && list.length) setSelectedModel(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [open, models.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Close model picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
        setModelSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  // Focus search when model picker opens
  useEffect(() => {
    if (showModelPicker) modelSearchRef.current?.focus();
  }, [showModelPicker]);

  const filteredModels = models.filter((m) => {
    if (showFreeOnly && !isModelFree(m)) return false;
    if (modelSearch.trim()) {
      const s = modelSearch.toLowerCase();
      return m.id.toLowerCase().includes(s) || m.name.toLowerCase().includes(s);
    }
    return true;
  });

  const selectedModelName =
    models.find((m) => m.id === selectedModel)?.name || selectedModel || "Select model";

  /* ── Send message ──────────────────────────────────────── */

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedModel || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "system", content: getSystemPrompt() }, ...newMessages],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err}` },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setStreamContent(accumulated);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Check if response contains a questions block
      const questionsMatch = accumulated.match(/```questions\n([\s\S]*?)```/);
      if (questionsMatch) {
        try {
          const parsed: PlanQuestion[] = JSON.parse(questionsMatch[1].trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Extract the intro text before the questions block
            const intro = accumulated.replace(/```questions\n[\s\S]*?```/, "").trim();
            if (intro) {
              setMessages((prev) => [...prev, { role: "assistant", content: intro }]);
            }
            setQuestionFlow({
              questions: parsed,
              currentIndex: 0,
              answers: [],
              showFinalInput: false,
              finalNote: "",
            });
            setStreamContent("");
            setStreaming(false);
            return;
          }
        } catch {
          // Failed to parse questions, fall through to normal display
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
      setStreamContent("");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "Something went wrong"}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [input, selectedModel, streaming, messages]);

  /* ── Question flow handlers ──────────────────────────── */

  const handleSelectOption = (option: string) => {
    if (!questionFlow) return;
    const { questions, currentIndex, answers } = questionFlow;
    const newAnswers = [...answers, { question: questions[currentIndex].question, answer: option }];

    if (currentIndex + 1 < questions.length) {
      // Next question
      setQuestionFlow({ ...questionFlow, currentIndex: currentIndex + 1, answers: newAnswers });
    } else {
      // All questions answered — show final input
      setQuestionFlow({ ...questionFlow, answers: newAnswers, showFinalInput: true });
      setTimeout(() => finalNoteRef.current?.focus(), 100);
    }
  };

  const handleSubmitAnswers = useCallback(() => {
    if (!questionFlow) return;
    const { answers, finalNote } = questionFlow;

    // Build a summary message from the answers
    let summary = "Here are my answers:\n\n";
    for (const a of answers) {
      summary += `**${a.question}**\n${a.answer}\n\n`;
    }
    if (finalNote.trim()) {
      summary += `**Additional notes:**\n${finalNote.trim()}\n`;
    }

    // Send as a user message
    const userMsg: Message = { role: "user", content: summary };
    setMessages((prev) => [...prev, userMsg]);
    setQuestionFlow(null);
    setInput("");

    // Trigger AI response with the answers
    setStreaming(true);
    setStreamContent("");

    const allMessages = [...messages, userMsg];

    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: getSystemPrompt() }, ...allMessages],
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }]);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setStreamContent(accumulated);
              }
            } catch {
              // skip
            }
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        setStreamContent("");
      })
      .catch((err: any) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message || "Something went wrong"}` },
        ]);
      })
      .finally(() => {
        setStreaming(false);
      });
  }, [questionFlow, messages, selectedModel]);

  /* ── Extract article block ────────────────────────────── */

  const extractArticle = (content: string): string | null => {
    const match = content.match(/```article\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const IMAGE_PLACEHOLDER_RE = /\[(?:GENERATE_IMAGE|Image):\s*(.+?)\]/g;

  const countImagePlaceholders = (text: string): number => {
    return [...text.matchAll(IMAGE_PLACEHOLDER_RE)].length;
  };

  const generateImagesAndInsert = async (content: string) => {
    const article = extractArticle(content);
    if (!article) return;

    setGeneratingImages(true);
    let processed = article;

    const placeholders = [...article.matchAll(IMAGE_PLACEHOLDER_RE)];

    if (placeholders.length > 0) {
      for (let i = 0; i < placeholders.length; i++) {
        const [fullMatch, description] = placeholders[i];
        setImageProgress(`Generating image ${i + 1} of ${placeholders.length}…`);

        try {
          const res = await fetch("/api/ai/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: description }),
          });

          if (res.ok) {
            const { url } = await res.json();
            processed = processed.replace(fullMatch, `![${description}](${url})`);
          } else {
            // Keep as alt text if generation fails
            processed = processed.replace(fullMatch, `*[Image: ${description}]*`);
          }
        } catch {
          processed = processed.replace(fullMatch, `*[Image: ${description}]*`);
        }
      }
    }

    setImageProgress("");
    setGeneratingImages(false);

    // Convert markdown to HTML and insert
    const { marked } = await import("marked");
    const html = marked.parse(processed, { async: false }) as string;
    onInsert(html);
    setOpen(false);
  };

  const handleInsertArticle = (content: string) => {
    const article = extractArticle(content);
    if (!article) return;

    const imageCount = countImagePlaceholders(article);
    if (imageCount > 0) {
      generateImagesAndInsert(content);
    } else {
      // No images, insert directly
      import("marked").then(({ marked }) => {
        const html = marked.parse(article, { async: false }) as string;
        onInsert(html);
        setOpen(false);
      });
    }
  };

  const handleInsertWithoutImages = (content: string) => {
    const article = extractArticle(content);
    if (!article) return;
    // Strip image placeholders and insert
    const stripped = article.replace(IMAGE_PLACEHOLDER_RE, "");
    import("marked").then(({ marked }) => {
      const html = marked.parse(stripped, { async: false }) as string;
      onInsert(html);
      setOpen(false);
    });
  };

  // Close modal on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showModelPicker && !showLinkInput) setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, showModelPicker]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  /* ── Render ────────────────────────────────────────────── */

  // showLinkInput is not used here but needed for the Escape handler
  const showLinkInput = false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
      >
        <Sparkles size={14} />
        AI Writer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-[95vw] max-w-6xl h-[90vh] flex flex-col rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 px-5 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--color-accent)]" />
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">AI Article Writer</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Model selector */}
            <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0" ref={modelPickerRef}>
              <label className="block text-[10px] tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-1.5">
                Model
              </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModelPicker(!showModelPicker)}
            disabled={loadingModels}
            className="w-full flex items-center justify-between rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
          >
            <span className="truncate">
              {loadingModels ? "Loading models…" : selectedModelName}
            </span>
            {loadingModels ? (
              <Loader2 size={14} className="animate-spin flex-shrink-0 ml-2" />
            ) : (
              <ChevronDown size={14} className="flex-shrink-0 ml-2 text-stone-400" />
            )}
          </button>

          {showModelPicker && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl">
              <div className="p-2 space-y-2">
                <input
                  ref={modelSearchRef}
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search models…"
                  className="w-full rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowFreeOnly(!showFreeOnly)}
                  className={`w-full rounded-md px-3 py-1.5 text-xs tracking-wider uppercase font-medium transition-colors ${
                    showFreeOnly
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                  }`}
                >
                  {showFreeOnly ? "Showing Free Only" : "Show Free Models Only"}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {filteredModels.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">
                    No models found.
                  </div>
                ) : (
                  filteredModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelPicker(false);
                        setModelSearch("");
                      }}
                      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        m.id === selectedModel
                          ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                      }`}
                    >
                      <Check
                        size={14}
                        className={`flex-shrink-0 ${
                          m.id === selectedModel ? "opacity-100 text-[var(--color-accent)]" : "opacity-0"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{m.name}</span>
                          {isModelFree(m) && (
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold tracking-wider uppercase">
                              Free
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-400 dark:text-stone-500 truncate block">
                          {m.id}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50/50 dark:bg-stone-950/30 min-h-0">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles size={24} className="text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-sm text-stone-400 dark:text-stone-500 max-w-sm">
              Describe the article you want to write. The AI will help you plan it, then generate the full article.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  {extractArticle(msg.content) && (
                    <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
                      {generatingImages && (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-accent)]">
                          <Loader2 size={12} className="animate-spin" />
                          {imageProgress}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {countImagePlaceholders(extractArticle(msg.content)!) > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleInsertArticle(msg.content)}
                              disabled={generatingImages}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider uppercase font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ background: "var(--color-accent)" }}
                            >
                              <ImageIcon size={12} />
                              Generate Images & Insert
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertWithoutImages(msg.content)}
                              disabled={generatingImages}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider uppercase font-medium text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-colors disabled:opacity-50"
                            >
                              <FileText size={12} />
                              Insert without Images
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInsertArticle(msg.content)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider uppercase font-medium text-white transition-opacity hover:opacity-80"
                            style={{ background: "var(--color-accent)" }}
                          >
                            <FileText size={12} />
                            Insert into Editor
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const article = extractArticle(msg.content);
                            if (article) navigator.clipboard.writeText(article);
                          }}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider uppercase font-medium text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {streaming && streamContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100">
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {streaming && !streamContent && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        {/* Question flow UI */}
        {questionFlow && !questionFlow.showFinalInput && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full rounded-xl px-5 py-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  {questionFlow.questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i < questionFlow.currentIndex
                          ? "w-6 bg-[var(--color-accent)]"
                          : i === questionFlow.currentIndex
                          ? "w-6 bg-[var(--color-accent)]/50"
                          : "w-3 bg-stone-200 dark:bg-stone-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] tracking-wider uppercase text-stone-400 dark:text-stone-500 ml-auto">
                  {questionFlow.currentIndex + 1} of {questionFlow.questions.length}
                </span>
              </div>

              {/* Question */}
              <p className="text-sm font-medium mb-3">
                {questionFlow.questions[questionFlow.currentIndex].question}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {questionFlow.questions[questionFlow.currentIndex].options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className="w-full text-left rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-sm hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Final input after all questions */}
        {questionFlow?.showFinalInput && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full rounded-xl px-5 py-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100">
              {/* Progress - all done */}
              <div className="flex gap-1 mb-3">
                {questionFlow.questions.map((_, i) => (
                  <div key={i} className="h-1.5 w-6 rounded-full bg-[var(--color-accent)]" />
                ))}
              </div>

              {/* Answers summary */}
              <div className="mb-4 space-y-1.5">
                {questionFlow.answers.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Check size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" />
                    <span className="text-stone-500 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{a.question}</span>{" "}
                      — {a.answer}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm font-medium mb-2">
                Is there anything else you would like to add to this plan?
              </p>
              <textarea
                ref={finalNoteRef}
                value={questionFlow.finalNote}
                onChange={(e) =>
                  setQuestionFlow((prev) => prev ? { ...prev, finalNote: e.target.value } : null)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnswers();
                  }
                }}
                rows={2}
                placeholder="Any additional details, preferences, or specific points to include… (optional)"
                className="w-full resize-none rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none mb-3"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmitAnswers}
                  className="rounded-full px-4 py-1.5 text-xs tracking-wider uppercase font-medium text-white transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-accent)" }}
                >
                  Create Plan
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionFlow(null)}
                  className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

            {/* Input area — hidden during question flow */}
            <div className={`border-t border-stone-200 dark:border-stone-700 p-4 flex items-end gap-2 flex-shrink-0 ${questionFlow ? "hidden" : ""}`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe the article you want to write…"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || !selectedModel || streaming}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "var(--color-accent)" }}
              >
                {streaming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
