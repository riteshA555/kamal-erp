-- SECURITY HARDENING MIGRATION
-- Level 3 Multi-Tenant Isolation

-- 1. MODERNIZE SCHEMA (Add user_id to master tables)
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE karigars ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE job_work_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE karigar_work_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. ENFORCE RLS (Row Level Security)
-- Disable permissive policies and add strict ownership checks

-- PRODUCTS
DROP POLICY IF EXISTS "Auth users full access products" ON products;
CREATE POLICY "Strict user isolation products" ON products FOR ALL USING (auth.uid() = user_id);

-- KARIGARS
DROP POLICY IF EXISTS "Auth users access karigars" ON karigars;
CREATE POLICY "Strict user isolation karigars" ON karigars FOR ALL USING (auth.uid() = user_id);

-- JOB WORK ITEMS
DROP POLICY IF EXISTS "Auth users full access job_work" ON job_work_items;
CREATE POLICY "Strict user isolation job_work" ON job_work_items FOR ALL USING (auth.uid() = user_id);

-- LEDGERS
DROP POLICY IF EXISTS "Auth users access ledgers" ON ledgers;
CREATE POLICY "Strict user isolation ledgers" ON ledgers FOR ALL USING (auth.uid() = user_id);

-- EXPENSES
DROP POLICY IF EXISTS "Auth users access expenses" ON expenses;
CREATE POLICY "Strict user isolation expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

-- KARIGAR RECORDS
DROP POLICY IF EXISTS "Auth users access karigar_records" ON karigar_work_records;
CREATE POLICY "Strict user isolation karigar_records" ON karigar_work_records FOR ALL USING (auth.uid() = user_id);

-- 3. AUDIT RE-ENFORCEMENT (Ensure RLS is enabled everywhere)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE karigars ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE karigar_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_silver_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_karigar_gold_ledger ENABLE ROW LEVEL SECURITY;
