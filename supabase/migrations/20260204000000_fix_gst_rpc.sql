CREATE OR REPLACE FUNCTION create_order_atomic(
    p_customer_name TEXT,
    p_order_date DATE,
    p_material_type TEXT,
    p_items JSONB,
    p_gst_enabled BOOLEAN DEFAULT FALSE,
    p_gst_rate NUMERIC DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_user_id UUID;
    v_current_stock NUMERIC;
    v_product_name TEXT;
    
    -- Financial Variabls
    v_subtotal NUMERIC := 0;
    v_gst_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    
    -- Ledger IDs
    v_customer_ledger_id UUID;
    v_income_ledger_id UUID;
    v_gst_ledger_id UUID;
    v_current_rate NUMERIC;
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Get/Create Ledgers
    -- Customer
    SELECT id INTO v_customer_ledger_id FROM ledgers WHERE name = p_customer_name LIMIT 1;
    IF v_customer_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type) VALUES (p_customer_name, 'ASSET') RETURNING id INTO v_customer_ledger_id;
    END IF;
    
    -- Income
    SELECT id INTO v_income_ledger_id FROM ledgers WHERE name = (CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END) LIMIT 1;
    IF v_income_ledger_id IS NULL THEN
        INSERT INTO ledgers (name, type) VALUES ((CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END), 'INCOME') RETURNING id INTO v_income_ledger_id;
    END IF;
    
    -- GST
    IF p_gst_enabled THEN
        SELECT id INTO v_gst_ledger_id FROM ledgers WHERE name = 'GST Output Tax' LIMIT 1;
        IF v_gst_ledger_id IS NULL THEN
            INSERT INTO ledgers (name, type) VALUES ('GST Output Tax', 'LIABILITY') RETURNING id INTO v_gst_ledger_id;
        END IF;
    END IF;

    -- 2. Calculate Totals First
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        quantity NUMERIC, 
        rate NUMERIC
    ) LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.rate);
    END LOOP;
    
    IF p_gst_enabled THEN
        v_gst_amount := (v_subtotal * p_gst_rate) / 100;
    END IF;
    
    v_total_amount := v_subtotal + v_gst_amount;

    -- 3. Insert Order
    INSERT INTO orders (
        customer_name, order_date, material_type, user_id, 
        gst_enabled, gst_rate, gst_amount, subtotal, total_amount
    )
    VALUES (
        p_customer_name, p_order_date, p_material_type, v_user_id,
        p_gst_enabled, p_gst_rate, v_gst_amount, v_subtotal, v_total_amount
    )
    RETURNING id INTO v_order_id;
    
    -- Get Current Silver Rate for Stock Valuation
    SELECT rate_1g INTO v_current_rate FROM silver_rates ORDER BY rate_date DESC LIMIT 1;
    IF v_current_rate IS NULL THEN v_current_rate := 0; END IF;

    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        description TEXT, 
        quantity NUMERIC, 
        unit TEXT, 
        rate NUMERIC, 
        product_id UUID,
        weight NUMERIC,
        wastage_percent NUMERIC,
        labour_cost NUMERIC,
        karigar_id UUID,
        karigar_rate NUMERIC,
        karigar_quantity NUMERIC
    ) LOOP
        -- A) Stock Logic: If OWN material, check and reduce stock
        IF p_material_type = 'OWN' AND v_item.product_id IS NOT NULL THEN
            SELECT current_stock, name INTO v_current_stock, v_product_name 
            FROM products WHERE id = v_item.product_id;
            
            IF v_current_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for "%". Available: %', v_product_name, v_current_stock;
            END IF;

            -- Actually reduce stock
            UPDATE products 
            SET current_stock = current_stock - v_item.quantity 
            WHERE id = v_item.product_id;
            
            -- Log Stock Transaction
            INSERT INTO stock_transactions (
                date, type, item_type, product_id, quantity, weight_gm, note, user_id, source, rate_at_time, order_id
            ) VALUES (
                p_order_date, 'ORDER_DEDUCTION', 'FINISHED_GOODS', v_item.product_id, v_item.quantity, 
                (v_item.quantity * COALESCE(v_item.weight, 0)), 
                'Order Creation: ' || p_customer_name, v_user_id,
                'Order #' || v_order_id, v_current_rate, v_order_id
            );
        END IF;

        -- B) Insert Order Item
        INSERT INTO order_items (
            order_id, description, quantity, unit, rate, product_id, weight, wastage_percent, labour_cost
        ) VALUES (
            v_order_id, v_item.description, v_item.quantity, v_item.unit, v_item.rate, v_item.product_id, v_item.weight, v_item.wastage_percent, v_item.labour_cost
        );

        -- C) Karigar Work Record (If assigned)
        IF v_item.karigar_id IS NOT NULL THEN
            INSERT INTO karigar_work_records (
                karigar_id, order_id, description, quantity, rate, amount, work_date, payment_status
            ) VALUES (
                v_item.karigar_id, v_order_id, v_item.description || ' (Order Item)',
                COALESCE(v_item.karigar_quantity, v_item.quantity),
                COALESCE(v_item.karigar_rate, 0),
                (COALESCE(v_item.karigar_quantity, v_item.quantity) * COALESCE(v_item.karigar_rate, 0)),
                p_order_date, 'PENDING'
            );
        END IF;
    END LOOP;

    -- 5. Financial Transaction (Accounting Journal Entry)
    
    -- Debit Customer (Receivable)
    INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
    VALUES (v_customer_ledger_id, p_order_date, 'DEBIT', v_total_amount, v_total_amount, 0, 'Order #' || v_order_id, v_order_id, v_user_id);
    
    -- Credit Income
    INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
    VALUES (v_income_ledger_id, p_order_date, 'CREDIT', v_subtotal, 0, v_subtotal, 'Sales Income from Order #' || v_order_id, v_order_id, v_user_id);
    
    -- Credit GST Liability (if any)
    IF v_gst_amount > 0 THEN
        INSERT INTO transactions (ledger_id, date, type, amount, debit, credit, description, order_id, user_id)
        VALUES (v_gst_ledger_id, p_order_date, 'CREDIT', v_gst_amount, 0, v_gst_amount, 'GST Output for Order #' || v_order_id, v_order_id, v_user_id);
    END IF;

    RETURN jsonb_build_object('order_id', v_order_id, 'total_amount', v_total_amount);
END;
$$;
