-- 004_create_product_resources.sql
-- Adds support for multiple typed resources per product (pdf, image, video, link)

CREATE TABLE product_resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'video', 'link')),
  url         TEXT NOT NULL,
  title       TEXT,
  size        INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_resources_product_id ON product_resources(product_id);

ALTER TABLE product_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product resources are viewable by everyone"
  ON product_resources FOR SELECT
  USING (true);

CREATE POLICY "Product resources can be inserted by authenticated users"
  ON product_resources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Product resources can be updated by authenticated users"
  ON product_resources FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Product resources can be deleted by authenticated users"
  ON product_resources FOR DELETE
  USING (auth.role() = 'authenticated');
