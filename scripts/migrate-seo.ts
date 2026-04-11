/**
 * Run this script to add SEO columns to the posts table:
 *   npx tsx scripts/migrate-seo.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service_role key if available, otherwise fall back to publishable key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

async function migrate() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test: try to read posts first
  const { data, error: readErr } = await supabase.from("posts").select("id").limit(1);
  if (readErr) {
    console.error("Cannot connect to posts table:", readErr.message);
    process.exit(1);
  }
  console.log("Connected to Supabase. Found posts table.");

  // Try adding columns by inserting a test update with new fields
  // If columns don't exist, we need to use the SQL editor
  const testId = data?.[0]?.id;
  if (testId) {
    const { error } = await supabase
      .from("posts")
      .update({ author_name: "" })
      .eq("id", testId);

    if (error && error.message.includes("author_name")) {
      console.log("\nColumns don't exist yet. Please run this SQL in your Supabase dashboard SQL editor:\n");
      console.log("  ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name text DEFAULT '';");
      console.log("  ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_description text DEFAULT '';");
      console.log("  ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_keywords text DEFAULT '';");
      console.log("\nThen re-run this script to verify.");
      process.exit(1);
    } else if (!error) {
      console.log("author_name column exists.");
    }

    const { error: err2 } = await supabase
      .from("posts")
      .update({ meta_description: "" })
      .eq("id", testId);

    if (err2 && err2.message.includes("meta_description")) {
      console.log("meta_description column missing. Run the SQL above.");
      process.exit(1);
    } else if (!err2) {
      console.log("meta_description column exists.");
    }

    const { error: err3 } = await supabase
      .from("posts")
      .update({ meta_keywords: "" })
      .eq("id", testId);

    if (err3 && err3.message.includes("meta_keywords")) {
      console.log("meta_keywords column missing. Run the SQL above.");
      process.exit(1);
    } else if (!err3) {
      console.log("meta_keywords column exists.");
    }
  }

  console.log("\nAll SEO columns are ready!");
}

migrate();
