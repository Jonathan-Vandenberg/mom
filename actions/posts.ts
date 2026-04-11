"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function createPost(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = formData.get("excerpt") as string;
  const cover_image = formData.get("cover_image") as string;
  const author_name = formData.get("author_name") as string;
  const meta_description = formData.get("meta_description") as string;
  const meta_keywords = formData.get("meta_keywords") as string;
  const published = formData.get("published") === "true";

  if (!title) {
    return { error: "Title is required" };
  }

  const slug = slugify(title) + "-" + Date.now().toString(36);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      content: content || "",
      excerpt: excerpt || "",
      cover_image: cover_image || "",
      author_name: author_name || "",
      meta_description: meta_description || "",
      meta_keywords: meta_keywords || "",
      published,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/blog");
  revalidatePath("/admin");
  redirect(`/admin/posts/${data.id}/edit`);
}

export async function updatePost(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = formData.get("excerpt") as string;
  const cover_image = formData.get("cover_image") as string;
  const author_name = formData.get("author_name") as string;
  const meta_description = formData.get("meta_description") as string;
  const meta_keywords = formData.get("meta_keywords") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  const { error } = await supabase
    .from("posts")
    .update({
      title,
      content: content || "",
      excerpt: excerpt || "",
      cover_image: cover_image || "",
      author_name: author_name || "",
      meta_description: meta_description || "",
      meta_keywords: meta_keywords || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/blog");
  revalidatePath("/admin");
  return { success: "Post updated" };
}

export async function deletePost(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/blog");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function togglePublish(id: string, published: boolean) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("posts")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/blog");
  revalidatePath("/admin");
}
