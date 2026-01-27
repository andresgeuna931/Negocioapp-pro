-- Migration: 007_import_customers_rpc.sql
-- Feature: Bulk Import Customers with Initial Balance

CREATE OR REPLACE FUNCTION import_customers_with_balance(
    p_customers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_customer JSONB;
    v_new_customer_id UUID;
    v_account_id UUID;
    v_balance DECIMAL;
    v_created_count INT := 0;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get auth context
    SELECT tenant_id, id INTO v_tenant_id, v_user_id
    FROM profiles WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado o sin tenant');
    END IF;

    -- Loop through customers
    FOR v_customer IN SELECT * FROM jsonb_array_elements(p_customers)
    LOOP
        BEGIN
            -- 1. Create Customer
            INSERT INTO customers (
                tenant_id, full_name, dni, email, phone, address, credit_limit
            )
            VALUES (
                v_tenant_id,
                v_customer->>'full_name',
                NULLIF(v_customer->>'dni', ''),
                NULLIF(v_customer->>'email', ''),
                NULLIF(v_customer->>'phone', ''),
                NULLIF(v_customer->>'address', ''),
                COALESCE((v_customer->>'credit_limit')::DECIMAL, 0)
            )
            RETURNING id INTO v_new_customer_id;

            -- 2. Handle Initial Balance (Fiado)
            v_balance := COALESCE((v_customer->>'initial_balance')::DECIMAL, 0);

            IF v_balance > 0 THEN
                -- Find the account (created automatically by trigger 'trigger_create_customer_account')
                SELECT id INTO v_account_id FROM customer_accounts WHERE customer_id = v_new_customer_id;

                IF v_account_id IS NOT NULL THEN
                    -- Insert Debit Movement (Adjustment or Sale) to set initial debt
                    INSERT INTO account_movements (
                        tenant_id, account_id, type, amount, description, created_by
                    )
                    VALUES (
                        v_tenant_id, 
                        v_account_id, 
                        'adjustment_debit', 
                        v_balance, 
                        'Saldo Inicial (Importado)', 
                        v_user_id
                    );
                    -- Trigger 'trigger_update_account_balance' will update the account balance
                END IF;
            END IF;

            v_created_count := v_created_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Error en ' || (v_customer->>'full_name') || ': ' || SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'created_count', v_created_count,
        'errors', v_errors
    );
END;
$$;
