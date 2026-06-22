-- Starter data for a new user database.
-- Run this after schema.sql when the user should start with empty records.

INSERT INTO public.entities (name, type, short_code, currency, notes, is_active)
VALUES ('Personal', 'personal', 'PER', 'CAD', NULL, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.record_sequences (entity_id, record_type, last_sequence)
SELECT id, 'receipt', 0
FROM public.entities
WHERE name = 'Personal'
ON CONFLICT (entity_id, record_type) DO NOTHING;

INSERT INTO public.record_sequences (entity_id, record_type, last_sequence)
SELECT id, 'invoice', 0
FROM public.entities
WHERE name = 'Personal'
ON CONFLICT (entity_id, record_type) DO NOTHING;

INSERT INTO public.receipt_categories (name)
VALUES
  ('Restaurant'),
  ('Grocery'),
  ('Transportation'),
  ('Office'),
  ('Utilities'),
  ('Travel'),
  ('Medical'),
  ('R&M'),
  ('Professional'),
  ('Other')
ON CONFLICT DO NOTHING;

INSERT INTO public.receipt_item_categories (name)
VALUES
  ('Restaurant Food'),
  ('Drink'),
  ('Grocery'),
  ('Transportation'),
  ('Office'),
  ('Tools'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.invoice_categories (name)
VALUES
  ('Sales'),
  ('Service'),
  ('Consulting'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.invoice_item_categories (name)
VALUES
  ('Product'),
  ('Service'),
  ('Materials'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.item_categories (name)
VALUES
  ('Restaurant Food'),
  ('Drink'),
  ('Grocery'),
  ('Transportation'),
  ('Office'),
  ('Tools'),
  ('Product'),
  ('Service'),
  ('Materials'),
  ('Other')
ON CONFLICT (name) DO NOTHING;
