-- Corrige get_sales_summary para excluir ventas anuladas
-- Ejecutado en: Supabase SQL Editor (producción)

CREATE OR REPLACE FUNCTION get_sales_summary(p_period TEXT DEFAULT 'today')
RETURNS TABLE(total_sales BIGINT, total_amount NUMERIC, average_sale NUMERIC)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*)::BIGINT as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_sale
    FROM sales
    WHERE tenant_id = get_current_tenant_id()
    AND is_cancelled = false
    AND created_at >= CASE p_period
        WHEN 'today' THEN DATE_TRUNC('day', NOW())
        WHEN 'week' THEN DATE_TRUNC('week', NOW())
        WHEN 'month' THEN DATE_TRUNC('month', NOW())
        WHEN 'year' THEN DATE_TRUNC('year', NOW())
        ELSE DATE_TRUNC('day', NOW())
    END;
$$;
