-- ============================================
-- FIX DE EMERGENCIA: DESACTIVAR RLS EN PERFILES
-- ============================================
-- El sistema está atrapado en un bucle infinito de permisos.
-- Cortamos el nudo gordiano desactivando RLS SOLO en la tabla profiles
-- para permitir que el dashboard cargue.
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Confirmación visual
SELECT 'RLS desactivado en profiles - El sistema debería cargar ahora' as status;
