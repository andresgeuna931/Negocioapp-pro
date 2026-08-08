-- Corrige get_top_products para excluir ventas anuladas
-- Ejecutado en: Supabase SQL Editor (producción)

DROP FUNCTION IF EXISTS get_top_products(integer, text);

CREATE OR REPLACE FUNCTION get_top_products(p_limit INT DEFAULT 5, p_period TEXT DEFAULT 'month')
RETURNS TABLE(product_id UUID, product_name TEXT, total_qty NUMERIC, total_revenue NUMERIC, unit_type TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        si.product_id,
        si.product_name,
        SUM(si.qty) as total_qty,
        SUM(si.line_total) as total_revenue,
        p.unit_type::TEXT
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
    WHERE si.tenant_id = get_current_tenant_id()
    AND s.is_cancelled = false
    AND s.created_at >= CASE p_period
        WHEN 'today' THEN DATE_TRUNC('day', NOW())
        WHEN 'week' THEN DATE_TRUNC('week', NOW())
        WHEN 'month' THEN DATE_TRUNC('month', NOW())
        WHEN 'year' THEN DATE_TRUNC('year', NOW())
        ELSE DATE_TRUNC('month', NOW())
    END
    GROUP BY si.product_id, si.product_name, p.unit_type
    ORDER BY total_revenue DESC
    LIMIT p_limit;
$$;
