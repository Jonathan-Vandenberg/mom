"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized");

  return supabase;
}

export async function updateSettings(prevState: unknown, formData: FormData) {
  const supabase = await requireAdmin();

  const keys = [
    "site_name",
    "site_tagline",
    "logo_url",
    "hero_title",
    "hero_subtitle",
    "hero_image",
    "accent_color",
    "background_color",
    "font_heading",
    "font_body",
    "color_mode",
    "section_title",
  ];

  const updates = keys.map((key) => ({
    key,
    value: (formData.get(key) as string) ?? "",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("site_settings")
    .upsert(updates, { onConflict: "key" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: "Settings saved" };
}
