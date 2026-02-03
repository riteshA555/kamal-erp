-- LIVE READY SECURITY PATCH (LEVEL 3)
-- This migration implements strict multi-tenant isolation for all business data.

-- 1. SCHEMA UPGRADES (Ownership Columns)
ALTER TABLE master_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE karigars ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE job_work_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE karigar_work_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. HARDENED ATOMIC FUNCTIONS (Isolation Guaranteed)

-- A) create_order_atomic
CREATE OR REPLACE FUNCTION create_order_atomic(
    p_customer_name TEXT,
    p_order_date DATE,
    p_material_type TEXT,
    p_items JSONB,
    p_gst_enabled BOOLEAN DEFAULT FALSE,
    p_gst_rate NUMERIC DEFAULT 3
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order_id UUID;
    v_user_id UUID := auth.uid();
    v_customer_ledger_id UUID;
    v_income_ledger_id UUID;
    v_gst_ledger_id UUID;
    v_subtotal NUMERIC := 0;
    v_gst_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_current_rate NUMERIC;
    v_item RECORD;
    v_current_stock NUMERIC;
    v_product_name TEXT;
BEGIN
    -- Isolation Check: Get/Create Ledgers only for the current user
    SELECT id INTO v_customer_ledger_id FROM ledgers WHERE name = p_customer_name AND user_id = v_user_id LIMIT 1;
    IF v_customer_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type, user_id) VALUES (p_customer_name, 'ASSET', v_user_id) RETURNING id INTO v_customer_ledger_id;
    END IF;
    
    SELECT id INTO v_income_ledger_id FROM ledgers 
    WHERE name = (CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END) 
    AND user_id = v_user_id LIMIT 1;
    IF v_income_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type, user_id, is_system) 
        VALUES ((CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END), 'INCOME', v_user_id, TRUE) 
        RETURNING id INTO v_income_ledger_id;
    END IF;
    
    IF p_gst_enabled THEN
        SELECT id INTO v_gst_ledger_id FROM ledgers WHERE name = 'GST Output Tax' AND user_id = v_user_id LIMIT 1;
        IF v_gst_ledger_id IS NULL THEN
            INSERT INTO ledgers (name, type, user_id, is_system) VALUES ('GST Output Tax', 'LIABILITY', v_user_id, TRUE) RETURNING id INTO v_gst_ledger_id;
        END IF;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(quantity NUMERIC, rate NUMERIC) LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.rate);
    END LOOP;
    IF p_gst_enabled THEN v_gst_amount := (v_subtotal * p_gst_rate) / 100; END IF;
    v_total_amount := v_subtotal + v_gst_amount;

    INSERT INTO orders (customer_name, order_date, material_type, user_id, gst_enabled, gst_rate, gst_amount, subtotal, total_amount)
    VALUES (p_customer_name, p_order_date, p_material_type, v_user_id, p_gst_enabled, p_gst_rate, v_gst_amount, v_subtotal, v_total_amount)
    RETURNING id INTO v_order_id;
    
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        description TEXT, quantity NUMERIC, unit TEXT, rate NUMERIC, product_id UUID, weight NUMERIC, labour_cost NUMERIC, karigar_id UUID, karigar_rate NUMERIC, karigar_quantity NUMERIC
    ) LOOP
        IF p_material_type = 'OWN' AND v_item.product_id IS NOT NULL THEN
            UPDATE products SET current_stock = current_stock - v_item.quantity 
            WHERE id = v_item.product_id AND user_id = v_user_id;
        END IF;

        INSERT INTO order_items (order_id, description, quantity, unit, rate, product_id, weight, labour_cost, user_id)
        VALUES (v_order_id, v_item.description, v_item.quantity, v_item.unit, v_item.rate, v_item.product_id, v_item.weight, v_item.labour_cost, v_user_id);

        IF v_item.karigar_id IS NOT NULL THEN
            INSERT INTO karigar_work_records (karigar_id, order_id, description, quantity, rate, amount, work_date, user_id, payment_status)
            VALUES (v_item.karigar_id, v_order_id, v_item.description, v_item.quantity, v_item.karigar_rate, (v_item.quantity * v_item.karigar_rate), p_order_date, v_user_id, 'PENDING');
        END IF;
    END LOOP;

    INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
    VALUES (v_customer_ledger_id, p_order_date, 'DEBIT', v_total_amount, v_total_amount, 0, 'Order #' || v_order_id, v_order_id, v_user_id);
    INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
    VALUES (v_income_ledger_id, p_order_date, 'CREDIT', v_subtotal, 0, v_subtotal, 'Sales Income #' || v_order_id, v_order_id, v_user_id);
    IF v_gst_amount > 0 THEN
        INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
        VALUES (v_gst_ledger_id, p_order_date, 'CREDIT', v_gst_amount, 0, v_gst_amount, 'GST Output #' || v_order_id, v_order_id, v_user_id);
    END IF;

    RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

-- B) add_stock_entry_atomic
CREATE OR REPLACE FUNCTION add_stock_entry_atomic(
    p_date TIMESTAMPTZ, p_type TEXT, p_item_type TEXT, p_quantity NUMERIC, p_weight_gm NUMERIC, 
    p_product_id UUID, p_note TEXT, p_source TEXT, p_rate_at_time NUMERIC, p_wastage_percent NUMERIC,
    p_payment_amount NUMERIC DEFAULT 0, p_payment_mode TEXT DEFAULT NULL, p_vendor_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stock_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO stock_transactions (date, type, item_type, product_id, quantity, weight_gm, note, user_id, source, rate_at_time, wastage_percent)
    VALUES (p_date, p_type, p_item_type, p_product_id, p_quantity, p_weight_gm, p_note, v_user_id, p_source, p_rate_at_time, p_wastage_percent)
    RETURNING id INTO v_stock_id;

    IF p_payment_amount > 0 THEN
        IF p_payment_mode = 'Credit' THEN
            -- Securely check vendor ownership
            IF NOT EXISTS (SELECT 1 FROM ledgers WHERE id = p_vendor_id AND user_id = v_user_id) THEN
                RAISE EXCEPTION 'Access Denied: Invalid Vendor Ledger';
            END IF;
            INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, user_id)
            VALUES (p_vendor_id, p_date::date, 'CREDIT', p_payment_amount, 0, p_payment_amount, 'Material Purchase (Credit)', v_user_id);
        END IF;
        INSERT INTO expenses (date, head, amount, notes, gst_enabled, user_id)
        VALUES (p_date::date, 'Stock Purchase - ' || p_item_type, p_payment_amount, 'Stock ID: ' || v_stock_id, FALSE, v_user_id);
    END IF;

    IF p_item_type = 'FINISHED_GOODS' AND p_product_id IS NOT NULL THEN
        UPDATE products SET current_stock = current_stock + (CASE WHEN p_type IN ('PRODUCTION', 'RAW_IN') THEN p_quantity ELSE -p_quantity END)
        WHERE id = p_product_id AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'stock_id', v_stock_id);
END;
$$;

-- C) settle_karigar_payment_atomic
CREATE OR REPLACE FUNCTION settle_karigar_payment_atomic(
    p_karigar_id UUID, p_amount NUMERIC, p_mode TEXT, p_date DATE, p_notes TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_remaining_amount NUMERIC := p_amount;
    v_record RECORD;
    v_user_id UUID := auth.uid();
    v_karigar_name TEXT;
    v_settled_count INT := 0;
BEGIN
    -- Securely check karigar ownership
    SELECT name INTO v_karigar_name FROM karigars WHERE id = p_karigar_id AND user_id = v_user_id;
    IF v_karigar_name IS NULL THEN RAISE EXCEPTION 'Access Denied: Invalid Karigar'; END IF;

    FOR v_record IN SELECT id, amount FROM karigar_work_records WHERE karigar_id = p_karigar_id AND payment_status = 'PENDING' AND user_id = v_user_id ORDER BY work_date ASC FOR UPDATE LOOP
        IF v_remaining_amount >= v_record.amount THEN
            UPDATE karigar_work_records SET payment_status = 'PAID', payment_date = p_date, payment_mode = p_mode WHERE id = v_record.id;
            v_remaining_amount := v_remaining_amount - v_record.amount;
            v_settled_count := v_settled_count + 1;
        ELSE EXIT; END IF;
    END LOOP;

    IF v_remaining_amount > 0 THEN
        UPDATE karigars SET current_balance = COALESCE(current_balance, 0) + v_remaining_amount WHERE id = p_karigar_id AND user_id = v_user_id;
    END IF;

    INSERT INTO expenses (date, head, amount, notes, gst_enabled, user_id)
    VALUES (p_date, 'Karigar Payment - ' || v_karigar_name, p_amount, p_notes, FALSE, v_user_id);

    RETURN jsonb_build_object('success', true, 'settled_count', v_settled_count);
END;
$$;

-- 3. APPLY RLS HARDENING
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE karigars ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE karigar_work_records ENABLE ROW LEVEL SECURITY;

-- Clear previous loose policies (Safety)
DROP POLICY IF EXISTS "Auth users full access products" ON products;
DROP POLICY IF EXISTS "Auth users access karigars" ON karigars;
DROP POLICY IF EXISTS "Auth users access ledgers" ON ledgers;
DROP POLICY IF EXISTS "Auth users access expenses" ON expenses;
DROP POLICY IF EXISTS "Auth users access karigar_records" ON karigar_work_records;
DROP POLICY IF EXISTS "Auth users full access job_work" ON job_work_items;

-- Apply Strict Ownership
CREATE POLICY "Strict user isolation products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation karigars" ON karigars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation ledgers" ON ledgers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation karigar_records" ON karigar_work_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation job_work" ON job_work_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation orders" ON orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation order_items" ON order_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Strict user isolation stock" ON stock_transactions FOR ALL USING (auth.uid() = user_id);
