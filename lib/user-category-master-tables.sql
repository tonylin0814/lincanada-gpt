CREATE TABLE IF NOT EXISTS receipt_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_item_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_item_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO receipt_categories (name)
SELECT DISTINCT category
FROM receipts
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT DO NOTHING;

INSERT INTO receipt_item_categories (name)
SELECT DISTINCT item_category
FROM receipt_items
WHERE item_category IS NOT NULL AND item_category <> ''
ON CONFLICT DO NOTHING;

INSERT INTO invoice_categories (name)
SELECT DISTINCT category
FROM invoices
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT DO NOTHING;

INSERT INTO invoice_item_categories (name)
SELECT DISTINCT item_category
FROM invoice_items
WHERE item_category IS NOT NULL AND item_category <> ''
ON CONFLICT DO NOTHING;
