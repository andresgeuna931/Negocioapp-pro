-- ============================================
-- FIX: PERMITIR VER PROPIO PERFIL
-- ============================================
-- Este script soluciona el "Bucle de Redirección" permitiendo que el usuario
-- vea su propio perfil sin depender de la función get_current_tenant_id()
-- ============================================

-- 1. Eliminar política antigua si existe (para evitar conflictos o duplicados)
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;

-- 2. Crear nueva política más robusta
-- Permite ver el perfil si:
-- a) Es TU propio perfil (id = auth.uid()) -> Esto rompe el bucle
-- b) O perteneces al mismo tenant (lógica original)
-- c) O eres admin
CREATE POLICY "Users can view profiles"
    ON profiles FOR SELECT
    USING (
        id = auth.uid() OR 
        tenant_id = get_current_tenant_id() OR 
        is_admin()
    );

-- 3. Confirmación
SELECT 'Politica de perfiles actualizada' as result;
