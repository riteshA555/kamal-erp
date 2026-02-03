-- SECURITY HARDENING RPC UPDATES
-- Level 3 Multi-Tenant Isolation

-- 1. HARDEN create_order_atomic
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
    -- 1. Get/Create Ledgers (RESTRICTED TO USER)
    
    -- Customer Ledger
    SELECT id INTO v_customer_ledger_id FROM ledgers WHERE name = p_customer_name AND user_id = v_user_id LIMIT 1;
    IF v_customer_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type, user_id) VALUES (p_customer_name, 'ASSET', v_user_id) RETURNING id INTO v_customer_ledger_id;
    END IF;
    
    -- Income Ledger
    SELECT id INTO v_income_ledger_id FROM ledgers 
    WHERE name = (CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END) 
    AND user_id = v_user_id LIMIT 1;
    IF v_income_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type, user_id, is_system) 
        VALUES ((CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END), 'INCOME', v_user_id, TRUE) 
        RETURNING id INTO v_income_ledger_id;
    END IF;
    
    -- GST Ledger
    IF p_gst_enabled THEN
        SELECT id INTO v_gst_ledger_id FROM ledgers WHERE name = 'GST Output Tax' AND user_id = v_user_id LIMIT 1;
        IF v_gst_ledger_id IS NULL THEN
            INSERT INTO ledgers (name, type, user_id, is_system) VALUES ('GST Output Tax', 'LIABILITY', v_user_id, TRUE) RETURNING id INTO v_gst_ledger_id;
        END IF;
    END IF;

    -- [Rest of the logic remains the same, but now uses v_user_id for all inserts/lookups]
    -- ... (Referencing existing create_order_atomic logic)
    
    -- 2. Calculate Totals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(quantity NUMERIC, rate NUMERIC) LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.rate);
    END LOOP;
    IF p_gst_enabled THEN v_gst_amount := (v_subtotal * p_gst_rate) / 100; END IF;
    v_total_amount := v_subtotal + v_gst_amount;

    -- 3. Insert Order
    INSERT INTO orders (customer_name, order_date, material_type, user_id, gst_enabled, gst_rate, gst_amount, subtotal, total_amount)
    VALUES (p_customer_name, p_order_date, p_material_type, v_user_id, p_gst_enabled, p_gst_rate, v_gst_amount, v_subtotal, v_total_amount)
    RETURNING id INTO v_order_id;
    
    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        description TEXT, quantity NUMERIC, unit TEXT, rate NUMERIC, product_id UUID, weight NUMERIC, labour_cost NUMERIC, karigar_id UUID, karigar_rate NUMERIC, karigar_quantity NUMERIC
    ) LOOP
        -- Stock Deduction (Per-User product check)
        IF p_material_type = 'OWN' AND v_item.product_id IS NOT NULL THEN
            UPDATE products SET current_stock = current_stock - v_item.quantity 
            WHERE id = v_item.product_id AND user_id = v_user_id; -- SECURE CHECK
        END IF;

        INSERT INTO order_items (order_id, description, quantity, unit, rate, product_id, weight, labour_cost)
        VALUES (v_order_id, v_item.description, v_item.quantity, v_item.unit, v_item.rate, v_item.product_id, v_item.weight, v_item.labour_cost);

        IF v_item.karigar_id IS NOT NULL THEN
            INSERT INTO karigar_work_records (karigar_id, order_id, description, quantity, rate, amount, work_date, user_id)
            VALUES (v_item.karigar_id, v_order_id, v_item.description, v_item.quantity, v_item.karigar_rate, (v_item.quantity * v_item.karigar_rate), p_order_date, v_user_id);
        END IF;
    END LOOP;

    -- 5. Transactions
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
