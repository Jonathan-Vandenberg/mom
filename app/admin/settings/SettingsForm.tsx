"use client";

import { useActionState, useState, useEffect, useCallback, useRef } from "react";
import type { SiteSettings } from "@/lib/settings";
import ConfirmModal from "@/components/admin/ConfirmModal";

const FONT_OPTIONS = [
  "Inter",
  "Cormorant Garamond",
  "Playfair Display",
  "Lora",
  "Merriweather",
  "EB Garamond",
  "Raleway",
  "Josefin Sans",
];

const inputClass =
  "block w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-stone-900 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors";

const labelClass = "block text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-2";

const sectionHeadingClass =
  "text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800 pb-3 mb-5";

interface SettingsFormProps {
  settings: SiteSettings;
  action: (
    prevState: unknown,
    formData: FormData
  ) => Promise<{ error?: string; success?: string }>;
}

export default function SettingsForm({ settings, action }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fontHeading, setFontHeading] = useState(settings.font_heading);
  const [fontBody, setFontBody] = useState(settings.font_body);
  const [heroImage, setHeroImage] = useState(settings.hero_image);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Compare current form values to initial settings to determine if truly dirty
  const isDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return false;
    const fd = new FormData(form);
    const keys: (keyof SiteSettings)[] = [
      "site_name", "site_tagline", "section_title",
      "hero_title", "hero_subtitle",
      "font_heading", "font_body",
      "color_mode", "accent_color", "background_color",
    ];
    for (const key of keys) {
      if ((fd.get(key) as string ?? "") !== (settings[key] ?? "")) return true;
    }
    // Check hidden fields managed via state
    if (logoUrl !== (settings.logo_url ?? "")) return true;
    if (heroImage !== (settings.hero_image ?? "")) return true;
    if (fontHeading !== settings.font_heading) return true;
    if (fontBody !== settings.font_body) return true;
    return false;
  }, [settings, logoUrl, heroImage, fontHeading, fontBody]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript")) return;
      if (link.target === "_blank") return;
      if (!isDirty()) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = href;
      setShowLeaveWarning(true);
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [isDirty]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { alert(`Upload failed: ${data.error}`); return; }
      if (data.url) setLogoUrl(data.url);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { alert(`Upload failed: ${data.error}`); return; }
      if (data.url) setHeroImage(data.url);
    } finally {
      setUploadingHero(false);
    }
  }

  return (
    <>
    <form ref={formRef} action={formAction} className="space-y-10 max-w-2xl">

      {/* Identity */}
      <section>
        <h2 className={sectionHeadingClass}>Identity</h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Site Name</label>
            <input name="site_name" type="text" defaultValue={settings.site_name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input name="site_tagline" type="text" defaultValue={settings.site_tagline} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Articles Section Title</label>
            <input name="section_title" type="text" defaultValue={settings.section_title} className={inputClass} placeholder="e.g. Sacred Readings, Latest Articles" />
          </div>
          <div>
            <label className={labelClass}>Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-stone-200 file:text-xs file:tracking-widest file:uppercase file:text-stone-500 file:bg-transparent hover:file:border-stone-400 file:cursor-pointer file:transition-colors"
            />
            {uploadingLogo && (
              <p className="mt-2 text-xs tracking-wider text-stone-400">Uploading…</p>
            )}
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo preview" className="h-12 w-auto object-contain rounded-lg border border-stone-100 dark:border-stone-800 p-1" />
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
            <input type="hidden" name="logo_url" value={logoUrl} />
          </div>
        </div>
      </section>

      {/* Hero */}
      <section>
        <h2 className={sectionHeadingClass}>Hero Section</h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Hero Title</label>
            <input name="hero_title" type="text" defaultValue={settings.hero_title} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hero Subtitle</label>
            <textarea
              name="hero_subtitle"
              rows={3}
              defaultValue={settings.hero_subtitle}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Hero Background Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleHeroImageUpload}
              className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-stone-200 file:text-xs file:tracking-widest file:uppercase file:text-stone-500 file:bg-transparent hover:file:border-stone-400 file:cursor-pointer file:transition-colors"
            />
            {uploadingHero && (
              <p className="mt-2 text-xs tracking-wider text-stone-400">Uploading…</p>
            )}
            {heroImage && (
              <div className="mt-3 relative h-36 w-full overflow-hidden rounded-xl border border-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="Hero preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setHeroImage("")}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            <input type="hidden" name="hero_image" value={heroImage} />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className={sectionHeadingClass}>Typography</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Heading Font</label>
            <select name="font_heading" value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className={inputClass}>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <p className="mt-2 text-xl text-stone-900 dark:text-stone-100" style={{ fontFamily: fontHeading }}>
              {fontHeading} looks like this
            </p>
          </div>
          <div>
            <label className={labelClass}>Body Font</label>
            <select name="font_body" value={fontBody} onChange={(e) => setFontBody(e.target.value)} className={inputClass}>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <p className="mt-2 text-xl text-stone-900 dark:text-stone-100" style={{ fontFamily: fontBody }}>
              {fontBody} looks like this
            </p>
          </div>
        </div>
      </section>

      <input type="hidden" name="color_mode" value="light" />

      {/* Colors */}
      <section>
        <h2 className={sectionHeadingClass}>Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                name="accent_color"
                type="color"
                defaultValue={settings.accent_color}
                className="h-10 w-14 rounded-lg border border-stone-200 cursor-pointer p-1"
              />
              <span className="text-xs text-stone-400">
                Buttons, links, highlights
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Background Color</label>
            <div className="flex items-center gap-3">
              <input
                name="background_color"
                type="color"
                defaultValue={settings.background_color}
                className="h-10 w-14 rounded-lg border border-stone-200 cursor-pointer p-1"
              />
              <span className="text-xs text-stone-400">
                Page background
              </span>
            </div>
          </div>
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-rose-500">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full px-8 py-2.5 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "var(--color-accent)" }}
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>

      <ConfirmModal
        open={showLeaveWarning}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        destructive
        onConfirm={() => {
          setShowLeaveWarning(false);
          if (pendingNavRef.current) {
            window.location.href = pendingNavRef.current;
          }
        }}
        onCancel={() => {
          pendingNavRef.current = null;
          setShowLeaveWarning(false);
        }}
      />
    </>
  );
}
