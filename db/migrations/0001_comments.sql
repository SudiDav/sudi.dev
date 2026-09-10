CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug text NOT NULL CHECK (article_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('google', 'github', 'guest')),
  author_key text,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  author_avatar_url text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  status text NOT NULL CHECK (status IN ('pending', 'published', 'rejected', 'spam')),
  actor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (author_type = 'guest' AND author_key IS NULL)
    OR (author_type IN ('google', 'github') AND author_key IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS comments_public_thread_idx
  ON comments (article_slug, status, created_at);

CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON comments (parent_id);

CREATE INDEX IF NOT EXISTS comments_actor_recent_idx
  ON comments (actor_key, created_at DESC);
