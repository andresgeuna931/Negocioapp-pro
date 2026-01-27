-- ============================================
-- FIX: OPTIMIZAR GET_CURRENT_TENANT_ID
-- ============================================
-- Redefinimos la función central para asegurar que no cause bloqueos
-- ni recursión infinita, y use el search_path correcto.
-- ============================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql -- Cambiamos a PLPGSQL para más control
STABLE
SECURITY DEFINER -- Ejecuta como superusuario (bypass RLS)
SET search_path = public -- Forzar esquema public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Busca el tenant_id directamente. 
    -- Al ser SECURITY DEFINER y estar en PLPGSQL con search_path definido,
    -- es mucho más seguro y evita loops de RLS.
    SELECT tenant_id INTO v_tenant_id
    FROM profiles 
    WHERE id = auth.uid();
    
    RETURN v_tenant_id;
END;
$$;

-- Confirmación
SELECT 'Funcion optimizada correctamente' as result;
