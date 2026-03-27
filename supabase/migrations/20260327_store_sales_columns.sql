-- ADD ROBUST COLUMNS TO STORE_SALES FOR MERCADO PAGO
-- Ensuring all necessary fields exist for a reliable checkout flow

ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS external_reference TEXT UNIQUE;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS status_detail TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS payment_id BIGINT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS installments INT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS shipping_label TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE store_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Re-create index for external_reference for fast lookups in webhook
CREATE INDEX IF NOT EXISTS idx_store_sales_external_ref ON store_sales(external_reference);
