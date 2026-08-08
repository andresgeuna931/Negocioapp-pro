-- RPC transaccional completo para ventas
-- Ejecutado en: Supabase SQL Editor (producción)
-- Incluye: venta, items, stock, movimientos de inventario, deuda de cuenta corriente, impacto en caja

CREATE OR REPLACE FUNCTION process_sale_v4(
    p_items JSONB,
    p_payment_method TEXT,
    p_notes TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID; v_tenant_id UUID; v_sale_id UUID; v_session_id UUID;
    v_item JSONB; v_product RECORD; v_account RECORD;
    v_qty NUMERIC; v_unit_price NUMERIC; v_unit_cost NUMERIC; v_line_total NUMERIC;
    v_total NUMERIC := 0; v_stock_before NUMERIC; v_is_account BOOLEAN;
    v_credit_limit NUMERIC; v_customer_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No autenticado'); END IF;
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado'); END IF;
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'La venta debe tener al menos un producto'); END IF;
    v_is_account := (p_payment_method = 'account');
    SELECT id INTO v_session_id FROM cash_sessions WHERE tenant_id = v_tenant_id AND status = 'open' LIMIT 1;
    IF v_session_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No hay caja abierta. Abrí la caja antes de realizar ventas.'); END IF;
    IF v_is_account THEN
        IF p_customer_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Se requiere cliente para Cuenta Corriente'); END IF;
        SELECT * INTO v_account FROM customer_accounts WHERE customer_id = p_customer_id AND tenant_id = v_tenant_id FOR UPDATE;
        IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'El cliente no tiene cuenta habilitada.'); END IF;
        SELECT credit_limit, full_name INTO v_credit_limit, v_customer_name FROM customers WHERE id = p_customer_id AND tenant_id = v_tenant_id;
        IF COALESCE(v_credit_limit, 0) = 0 THEN RETURN jsonb_build_object('success', false, 'error', COALESCE(v_customer_name, 'El cliente') || ' no tiene límite de crédito habilitado.'); END IF;
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        IF v_qty IS NULL OR v_qty <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Cantidad inválida'); END IF;
        IF v_item->>'unit_price' IS NOT NULL THEN v_unit_price := (v_item->>'unit_price')::NUMERIC;
        ELSE SELECT price INTO v_unit_price FROM products WHERE id = (v_item->>'product_id')::UUID AND tenant_id = v_tenant_id; END IF;
        IF v_unit_price IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado: ' || COALESCE(v_item->>'product_id', '')); END IF;
        v_total := v_total + (v_qty * v_unit_price);
    END LOOP;
    IF v_is_account AND COALESCE(v_account.balance, 0) + v_total > v_credit_limit THEN
        RETURN jsonb_build_object('success', false, 'error', 'Límite de crédito excedido. Debe: $' || to_char(COALESCE(v_account.balance,0), 'FM999G999G999') || ' + Venta: $' || to_char(v_total, 'FM999G999G999') || ' > Límite: $' || to_char(v_credit_limit, 'FM999G999G999'));
    END IF;
    INSERT INTO sales (tenant_id, sold_by, total_amount, payment_method, notes)
    VALUES (v_tenant_id, v_user_id, v_total, p_payment_method::public.payment_method, p_notes) RETURNING id INTO v_sale_id;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID AND tenant_id = v_tenant_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id'; END IF;
        IF v_item->>'unit_price' IS NOT NULL THEN v_unit_price := (v_item->>'unit_price')::NUMERIC; ELSE v_unit_price := v_product.price; END IF;
        v_unit_cost := COALESCE(v_product.cost, 0);
        v_line_total := v_qty * v_unit_price;
        v_stock_before := v_product.stock_on_hand;
        IF v_product.stock_on_hand < v_qty THEN RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, Solicitado: %', v_product.name, v_product.stock_on_hand, v_qty; END IF;
        INSERT INTO sale_items (tenant_id, sale_id, product_id, product_name, qty, unit_price, unit_cost, line_total) VALUES (v_tenant_id, v_sale_id, v_product.id, v_product.name, v_qty, v_unit_price, v_unit_cost, v_line_total);
        UPDATE products SET stock_on_hand = stock_on_hand - v_qty WHERE id = v_product.id;
        INSERT INTO inventory_movements (tenant_id, product_id, type, qty_change, stock_before, stock_after, reference_id, created_by) VALUES (v_tenant_id, v_product.id, 'sale', -v_qty, v_stock_before, v_stock_before - v_qty, v_sale_id, v_user_id);
    END LOOP;
    IF v_is_account THEN
        INSERT INTO account_movements (tenant_id, account_id, type, amount, description, reference_id, created_by) VALUES (v_tenant_id, v_account.id, 'sale', v_total, 'Compra en mostrador', v_sale_id, v_user_id);
    END IF;
    IF NOT v_is_account THEN
        IF p_payment_method = 'cash' THEN UPDATE cash_sessions SET total_sales_cash = COALESCE(total_sales_cash, 0) + v_total WHERE id = v_session_id;
        ELSE UPDATE cash_sessions SET total_sales_other = COALESCE(total_sales_other, 0) + v_total WHERE id = v_session_id; END IF;
    END IF;
    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'total', v_total);
END;
$$;
