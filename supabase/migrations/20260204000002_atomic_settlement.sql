-- Atomic Function for Karigar Settlement (FIFO)
CREATE OR REPLACE FUNCTION settle_karigar_payment_atomic(
    p_karigar_id UUID,
    p_amount NUMERIC,
    p_mode TEXT,
    p_date DATE,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining_amount NUMERIC := p_amount;
    v_record RECORD;
    v_settled_count INT := 0;
    v_karigar_name TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Get Karigar Name for Expense Note
    SELECT name INTO v_karigar_name FROM karigars WHERE id = p_karigar_id;

    -- 2. Loop through Pending Records (FIFO)
    -- FOR UPDATE locks these rows to prevent race conditions
    FOR v_record IN 
        SELECT id, amount 
        FROM karigar_work_records 
        WHERE karigar_id = p_karigar_id AND payment_status = 'PENDING' 
        ORDER BY work_date ASC
        FOR UPDATE
    LOOP
        IF v_remaining_amount >= v_record.amount THEN
            -- Full Settle this record
            UPDATE karigar_work_records 
            SET payment_status = 'PAID', payment_date = p_date, payment_mode = p_mode
            WHERE id = v_record.id;
            
            v_remaining_amount := v_remaining_amount - v_record.amount;
            v_settled_count := v_settled_count + 1;
        ELSE
            -- Cannot fully settle next record, stop loop
            EXIT;
        END IF;

        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- 3. Handle Excess Amount (Add to Advance Balance)
    IF v_remaining_amount > 0 THEN
         UPDATE karigars 
         SET current_balance = COALESCE(current_balance, 0) + v_remaining_amount 
         WHERE id = p_karigar_id
         RETURNING current_balance INTO v_new_balance;
    ELSE
         SELECT current_balance INTO v_new_balance FROM karigars WHERE id = p_karigar_id;
    END IF;

    -- 4. Create Expense Entry
    INSERT INTO expenses (
        date, head, amount, notes, gst_enabled
    ) VALUES (
        p_date, 
        'Karigar Payment - ' || v_karigar_name, 
        p_amount, 
        'Paid via ' || p_mode || '. Settled ' || v_settled_count || ' records. Remaining/Advance: ' || v_remaining_amount || '. ' || p_notes, 
        FALSE
    );

    RETURN jsonb_build_object(
        'success', true, 
        'settled_count', v_settled_count, 
        'advance_balance', v_new_balance
    );
END;
$$;
