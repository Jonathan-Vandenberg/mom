import { createClient } from "@/lib/supabase/server";

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  accent_color: string;
  background_color: string;
  font_heading: string;
  font_body: string;
  color_mode: "light" | "dark";
  section_title: string;
}

const defaults: SiteSettings = {
  site_name: "The Inner Path",
  site_tagline: "Wisdom for the awakening soul",
  hero_title: "Find Your Inner Peace",
  hero_subtitle:
    "Explore timeless teachings, spiritual practices, and wisdom traditions from around the world.",
  logo_url: "",
  hero_image: "",
  accent_color: "#7c3aed",
  background_color: "#faf9f7",
  font_heading: "Cormorant Garamond",
  font_body: "Inter",
  color_mode: "light",
  section_title: "Sacred Readings",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");

  if (!data) return defaults;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value ?? ""]));

  return {
    site_name: map.site_name ?? defaults.site_name,
    site_tagline: map.site_tagline ?? defaults.site_tagline,
    logo_url: map.logo_url ?? defaults.logo_url,
    hero_title: map.hero_title ?? defaults.hero_title,
    hero_subtitle: map.hero_subtitle ?? defaults.hero_subtitle,
    hero_image: map.hero_image ?? defaults.hero_image,
    accent_color: map.accent_color ?? defaults.accent_color,
    background_color: map.background_color ?? defaults.background_color,
    font_heading: map.font_heading ?? defaults.font_heading,
    font_body: map.font_body ?? defaults.font_body,
    color_mode: (map.color_mode === "dark" ? "dark" : "light") as "light" | "dark",
    section_title: map.section_title ?? defaults.section_title,
  };
}
