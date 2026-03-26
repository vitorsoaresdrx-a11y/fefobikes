-- MERCADO PAGO INTEGRATION: SALES TABLE
-- This table stores all checkout attempts and approved sales from the store.

CREATE TABLE IF NOT EXISTS store_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id BIGINT UNIQUE, -- ID returned by Mercado Pago
  status TEXT, -- approved, rejected, in_process, cancelled
  status_detail TEXT, -- detailed result (e.g., cc_rejected_insufficient_amount)
  total_amount NUMERIC(10, 2), -- itens + frete
  shipping_amount NUMERIC(10, 2), -- frete specifically
  items JSONB, -- list of itens purchased
  customer_name TEXT,
  customer_email TEXT,
  customer_cpf TEXT,
  customer_phone TEXT,
  approved_at TIMESTAMPTZ, -- set by webhook or /create if immediate
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing approved sales (GET /api/vendas)
CREATE INDEX idx_store_sales_status ON store_sales(status, created_at DESC);

-- Enable RLS (Optional, can be restricted to service_role)
ALTER TABLE store_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read if approved" ON store_sales FOR SELECT USING (status = 'approved');
