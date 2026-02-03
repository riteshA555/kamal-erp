-- Atomic Function for Stock + Financial Entry
CREATE OR REPLACE FUNCTION add_stock_entry_atomic(
    p_date TIMESTAMPTZ,
    p_type TEXT,
    p_item_type TEXT,
    p_quantity NUMERIC,
    p_weight_gm NUMERIC,
    p_product_id UUID,
    p_note TEXT,
    p_source TEXT,
    p_rate_at_time NUMERIC,
    p_wastage_percent NUMERIC,
    p_payment_amount NUMERIC DEFAULT 0,
    p_payment_mode TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stock_id UUID;
    v_user_id UUID;
    v_transaction_id UUID;
    v_expense_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- 1. Insert Stock Transaction
    INSERT INTO stock_transactions (
        date, type, item_type, product_id, quantity, weight_gm, note, user_id, source, rate_at_time, wastage_percent
    ) VALUES (
        p_date, p_type, p_item_type, p_product_id, p_quantity, p_weight_gm, p_note, v_user_id, p_source, p_rate_at_time, p_wastage_percent
    ) RETURNING id INTO v_stock_id;

    -- 2. Handle Financials if Amount > 0
    IF p_payment_amount > 0 THEN
        IF p_payment_mode = 'Credit' THEN
            -- Credit Logic: Vendor Ledger Credit
            IF p_vendor_id IS NULL THEN
                RAISE EXCEPTION 'Vendor ID is required for Credit transactions';
            END IF;

            INSERT INTO transactions (
                ledger_id, date, type, amount, debit, credit, description, user_id
            ) VALUES (
                p_vendor_id, p_date::date, 'CREDIT', p_payment_amount, 0, p_payment_amount, 
                'Material Purchase (Credit) - ' || p_item_type, v_user_id
            );
            
            -- Expense Entry (Marked as unpaid/credit if needed, or just standard expense)
             INSERT INTO expenses (
                date, head, amount, notes, gst_enabled
            ) VALUES (
                p_date::date, 'Material Purchase (Credit) - ' || p_item_type, p_payment_amount,
                'Credit from Vendor. Stock Entry ID: ' || v_stock_id, FALSE
            );

        ELSE
            -- Cash/Bank Logic: Simple Expense
            INSERT INTO expenses (
                date, head, amount, notes, gst_enabled
            ) VALUES (
                p_date::date, 'Material Purchase - ' || p_item_type, p_payment_amount, 
                'Stock Entry ID: ' || v_stock_id || '. Mode: ' || p_payment_mode, FALSE
            );
        END IF;
    END IF;

    -- 3. Update Product Stock if FINISHED_GOODS
    IF p_item_type = 'FINISHED_GOODS' AND p_product_id IS NOT NULL THEN
        IF p_type = 'PRODUCTION' OR p_type = 'RAW_IN' THEN
            UPDATE products SET current_stock = current_stock + p_quantity WHERE id = p_product_id;
        ELSIF p_type = 'ORDER_DEDUCTION' OR p_type = 'RAW_OUT' THEN
             UPDATE products SET current_stock = current_stock - p_quantity WHERE id = p_product_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'stock_id', v_stock_id);
END;
$$;
