-- 005_create_conversations.sql
-- Creates the conversations table for persistent diagnostic sessions

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'New Diagnostic',
  user_id UUID NOT NULL,
  product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- Down migration:
-- DROP INDEX IF EXISTS idx_conversations_user_updated;
-- DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
-- DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
-- DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
-- DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
-- ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
-- DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS conversations;
