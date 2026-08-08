-- RPC transaccional para anulación de ventas
-- Ejecutado en: Supabase SQL Editor (producción)

CREATE OR REPLACE FUNCTION cancel_sale_v2(
    p_sale_id UUID,
    p_reason TEXT DEFAULT 'Anulada por operador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_sale RECORD;
    v_item RECORD;
    v_product RECORD;
    v_movement RECORD;
    v_open_session RECORD;
    v_new_stock NUMERIC;
    v_payment_method TEXT;
BEGIN
    v_user_id := auth.uid();
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
    END IF;
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id AND tenant_id = v_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Venta no encontrada');
    END IF;
    IF v_sale.is_cancelled THEN
        RETURN jsonb_build_object('success', false, 'error', 'La venta ya fue anulada');
    END IF;
    v_payment_method := v_sale.payment_method::TEXT;
    UPDATE sales SET is_cancelled = true, cancelled_at = NOW(), cancelled_by = v_user_id, cancellation_reason = p_reason WHERE id = p_sale_id;
    FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
    LOOP
        SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND tenant_id = v_tenant_id FOR UPDATE;
        IF FOUND THEN
            v_new_stock := v_product.stock_on_hand + v_item.qty;
            UPDATE products SET stock_on_hand = v_new_stock WHERE id = v_item.product_id;
            INSERT INTO inventory_movements (tenant_id, product_id, type, qty_change, stock_before, stock_after, notes, created_by)
            VALUES (v_tenant_id, v_item.product_id, 'adjustment', v_item.qty, v_product.stock_on_hand, v_new_stock, 'Anulación venta #' || LEFT(p_sale_id::TEXT, 8), v_user_id);
        END IF;
    END LOOP;
    SELECT * INTO v_movement FROM account_movements WHERE reference_id = p_sale_id AND type = 'sale' LIMIT 1;
    IF FOUND THEN
        INSERT INTO account_movements (tenant_id, account_id, type, amount, description, reference_id, created_by)
        VALUES (v_tenant_id, v_movement.account_id, 'adjustment_credit', v_movement.amount, 'Anulación venta #' || LEFT(p_sale_id::TEXT, 8), p_sale_id, v_user_id);
    END IF;
    SELECT * INTO v_open_session FROM cash_sessions WHERE status = 'open' AND tenant_id = v_tenant_id FOR UPDATE;
    IF FOUND THEN
        IF v_payment_method = 'cash' THEN
            UPDATE cash_sessions SET total_sales_cash = GREATEST(0, total_sales_cash - v_sale.total_amount) WHERE id = v_open_session.id;
        ELSIF v_payment_method NOT IN ('account', 'mixed') THEN
            UPDATE cash_sessions SET total_sales_other = GREATEST(0, total_sales_other - v_sale.total_amount) WHERE id = v_open_session.id;
        END IF;
    END IF;
    RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id);
END;
$$;
