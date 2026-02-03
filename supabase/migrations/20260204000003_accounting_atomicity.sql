-- 1. Add user_id to transactions for audit trail
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users;
    END IF;
END $$;

-- 2. Ensure "Cash Account" system ledger exists
INSERT INTO ledgers (name, type, is_system)
SELECT 'Cash Account', 'ASSET', true
WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE name = 'Cash Account');

-- 3. Atomic RPC for Ledger Payments
CREATE OR REPLACE FUNCTION record_ledger_payment_atomic(
    p_ledger_id UUID,
    p_amount NUMERIC,
    p_mode TEXT,
    p_date DATE,
    p_note TEXT,
    p_type TEXT -- 'IN' (Received from Customer) or 'OUT' (Paid to Vendor)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cash_ledger_id UUID;
    v_user_id UUID;
    v_description TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Get Cash Account ID
    SELECT id INTO v_cash_ledger_id FROM ledgers WHERE name = 'Cash Account' LIMIT 1;
    
    IF v_cash_ledger_id IS NULL THEN
        RAISE EXCEPTION 'Cash Account ledger not found. Please contact support.';
    END IF;

    IF p_type = 'IN' THEN
        -- Received from Customer:
        -- 1. Credit Customer Ledger (Decrease what they owe)
        INSERT INTO transactions (ledger_id, date, credit, debit, description, user_id)
        VALUES (p_ledger_id, p_date, p_amount, 0, 'Payment Received (' || p_mode || ') - ' || p_note, v_user_id);
        
        -- 2. Debit Cash/Bank Account (Increase what we have)
        INSERT INTO transactions (ledger_id, date, debit, credit, description, user_id)
        VALUES (v_cash_ledger_id, p_date, p_amount, 0, 'Customer Payment In (' || p_mode || ') - ' || p_note, v_user_id);

    ELSIF p_type = 'OUT' THEN
        -- Paid to Vendor:
        -- 1. Debit Vendor Ledger (Decrease what we owe)
        INSERT INTO transactions (ledger_id, date, debit, credit, description, user_id)
        VALUES (p_ledger_id, p_date, p_amount, 0, 'Payment Out (' || p_mode || ') - ' || p_note, v_user_id);
        
        -- 2. Credit Cash/Bank Account (Decrease what we have)
        INSERT INTO transactions (ledger_id, date, credit, debit, description, user_id)
        VALUES (v_cash_ledger_id, p_date, p_amount, 0, 'Vendor Payment Out (' || p_mode || ') - ' || p_note, v_user_id);
    
    ELSE
        RAISE EXCEPTION 'Invalid payment type. Use IN or OUT.';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
