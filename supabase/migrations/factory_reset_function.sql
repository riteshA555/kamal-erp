-- Factory Reset RPC Function
-- This function deletes all data from application tables

CREATE OR REPLACE FUNCTION reset_app_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Security Check: Ensure user is logged in
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Operational/Transaction Data (Only delete current user's data)
    DELETE FROM order_items WHERE user_id = v_user_id;
    DELETE FROM transactions WHERE user_id = v_user_id;
    DELETE FROM stock_transactions WHERE user_id = v_user_id;
    DELETE FROM karigar_work_records WHERE user_id = v_user_id;
    
    -- 2. Master Data
    DELETE FROM orders WHERE user_id = v_user_id;
    DELETE FROM products WHERE user_id = v_user_id;
    DELETE FROM karigars WHERE user_id = v_user_id;
    DELETE FROM expenses WHERE user_id = v_user_id;
    
    -- 3. Accounting
    -- Delete only this user's ledgers
    DELETE FROM ledgers WHERE user_id = v_user_id;
    
    -- 4. Settings
    DELETE FROM settings WHERE user_id = v_user_id;
    
    -- Note: silver_rates are kept as they are global market rates.
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_app_data() TO authenticated;

COMMENT ON FUNCTION reset_app_data() IS 'Factory reset: Deletes all application data but preserves user accounts';
