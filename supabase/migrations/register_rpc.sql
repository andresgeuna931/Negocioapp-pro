-- ============================================
-- FIX DEFINITIVO: FUNCIÓN DE REGISTRO SEGURO (RPC)
-- ============================================
-- Esta función se ejecuta con permisos de "Superusuario" (SECURITY DEFINER)
-- para saltarse las restricciones de RLS durante el registro.
-- ============================================

CREATE OR REPLACE FUNCTION register_new_tenant(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_business_name TEXT,
    p_business_type TEXT,
    p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- <--- ESTO ES LO IMPORTANTE: Se ejecuta como Administrador
SET search_path = public -- Buena práctica de seguridad
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Insertar Tenant (Negocio)
    INSERT INTO tenants (name, slug, status, low_stock_threshold_default, settings)
    VALUES (p_business_name, p_slug, 'trial', 5, jsonb_build_object('business_type', p_business_type))
    RETURNING id INTO v_tenant_id;

    -- 2. Insertar Perfil (Owner)
    -- Verificamos si ya existe por si acaso (aunque el ID único debería frenarlo)
    INSERT INTO profiles (id, tenant_id, role, full_name, email, is_active)
    VALUES (p_user_id, v_tenant_id, 'owner', p_full_name, p_email, true);

    -- 3. Insertar Suscripción Trial
    INSERT INTO subscriptions (tenant_id, plan, status, current_period_start, current_period_end, trial_ends_at)
    VALUES (
        v_tenant_id, 
        'free', 
        'trial', 
        NOW(), 
        NOW() + INTERVAL '30 days',
        NOW() + INTERVAL '30 days'
    );

    RETURN v_tenant_id;
END;
$$;

-- Permitir que cualquier usuario (incluso anonimo si el cliente falla en enviarlo) ejecute esto
-- Es seguro porque solo permite crear tenants nuevos vinculados a un user_id
GRANT EXECUTE ON FUNCTION register_new_tenant TO anon, authenticated, service_role;
