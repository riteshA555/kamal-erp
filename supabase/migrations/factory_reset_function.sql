-- Factory Reset RPC Function
-- This function deletes all data from application tables

CREATE OR REPLACE FUNCTION reset_app_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete all orders and related data
    DELETE FROM order_items WHERE TRUE;
    DELETE FROM orders WHERE TRUE;
    
    -- Delete all products
    DELETE FROM products WHERE TRUE;
    
    -- Delete all inventory
    DELETE FROM inventory WHERE TRUE;
    
    -- Delete all contacts
    DELETE FROM customers WHERE TRUE;
    DELETE FROM vendors WHERE TRUE;
    DELETE FROM karigars WHERE TRUE;
    
    -- Delete all transactions
    DELETE FROM transactions WHERE TRUE;
    DELETE FROM karigar_settlements WHERE TRUE;
    
    -- Delete all expenses
    DELETE FROM expenses WHERE TRUE;
    
    -- Reset settings to defaults (optional - keep settings)
    -- DELETE FROM settings WHERE TRUE;
    
    -- Note: We do NOT delete users from auth.users
    -- Users should remain for re-login after reset
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_app_data() TO authenticated;

COMMENT ON FUNCTION reset_app_data() IS 'Factory reset: Deletes all application data but preserves user accounts';
