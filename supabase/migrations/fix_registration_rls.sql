-- ============================================
-- FIX: HABILITAR REGISTRO Y SEEDING SCRIPT
-- ============================================
-- Este script soluciona los problemas de RLS que impedían el registro.
-- Ejecutar en Supabase SQL Editor.
-- ============================================

-- 1. Eliminar políticas restrictivas antiguas
DROP POLICY IF EXISTS "Only admins can create tenants" ON tenants;
DROP POLICY IF EXISTS "Active tenant can create products" ON products;
DROP POLICY IF EXISTS "Owners can create staff" ON profiles;

-- 2. Permitir a usuarios autenticados crear su propio Tenant (Negocio)
CREATE POLICY "Authenticated users can create a tenant"
    ON tenants FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Permitir a usuarios autenticados crear su propio Perfil
CREATE POLICY "Users can create their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid()); -- Solo pueden crear un perfil con SU propio ID de usuario

-- 4. Permitir insertar productos durante el registro (antes de que el tenant esté "activo" oficialmente)
CREATE POLICY "Authenticated users can create products for their tenant"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 5. Asegurar que las suscripciones también se puedan crear (si es necesario por el trigger o lógica de negocio)
-- Por defecto el esquema usa `create_tenant_with_owner` function para admins, 
-- pero nuestro flujo de frontend hace inserts directos.
DROP POLICY IF EXISTS "Only admins can create subscriptions" ON subscriptions;

CREATE POLICY "Owners can create their subscription"
    ON subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants 
            WHERE id = tenant_id -- verifica que el tenant existe (simplificado)
            -- En realidad, confiamos en las FK constraints para la integridad.
        )
    );

-- 6. HABILITAR RLS DE NUEVO (Por si se desactivó manualmente)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Nota: Esto asegura que el "Modo Dios" ya no sea necesario.
