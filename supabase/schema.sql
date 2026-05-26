-- ============================================================
-- LESSON NOTE — Supabase Schema
-- Paste toàn bộ file này vào Supabase SQL Editor và nhấn Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: subjects (Môn học)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '📚',
  color       TEXT NOT NULL DEFAULT '#6C5CE7',
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_order   ON public.subjects("order");

-- ============================================================
-- TABLE: notes (Ghi chú)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id    UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  plain_text    TEXT NOT NULL DEFAULT '',
  tags          TEXT[] DEFAULT '{}',
  is_pinned     BOOLEAN DEFAULT FALSE NOT NULL,
  is_bookmarked BOOLEAN DEFAULT FALSE NOT NULL,
  is_deleted    BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id       ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id    ON public.notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_deleted    ON public.notes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_is_bookmarked ON public.notes(is_bookmarked);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at    ON public.notes(updated_at DESC);

-- Full-text search index (Vietnamese + English)
CREATE INDEX IF NOT EXISTS idx_notes_fts ON public.notes 
  USING gin(to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(plain_text, '')));

-- ============================================================
-- TABLE: tags (Tag toàn cục)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  color      TEXT NOT NULL DEFAULT '#6C5CE7',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- ============================================================
-- TABLE: settings (Cài đặt người dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to subjects
DROP TRIGGER IF EXISTS on_subjects_updated ON public.subjects;
CREATE TRIGGER on_subjects_updated
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to notes
DROP TRIGGER IF EXISTS on_notes_updated ON public.notes;
CREATE TRIGGER on_notes_updated
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to settings
DROP TRIGGER IF EXISTS on_settings_updated ON public.settings;
CREATE TRIGGER on_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Mỗi user chỉ thấy dữ liệu của mình
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ── Subjects RLS policies ──────────────────────────────────
CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (auth.uid() = user_id);

-- ── Notes RLS policies ────────────────────────────────────
CREATE POLICY "notes_select" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- ── Tags RLS policies ─────────────────────────────────────
CREATE POLICY "tags_select" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tags_insert" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tags_update" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tags_delete" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- ── Settings RLS policies ─────────────────────────────────
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_upsert" ON public.settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "settings_delete" ON public.settings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- DONE! Schema tạo xong.
-- ============================================================
