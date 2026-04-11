-- Add author and SEO fields to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name text DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_description text DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_keywords text DEFAULT '';
