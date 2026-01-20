-- ============================================
-- SISTEMA KIOSCO BARRIAL - POLÍTICAS RLS
-- ============================================
-- Row Level Security para aislamiento multi-tenant
-- Ejecutar DESPUÉS de schema.sql
-- ============================================

-- ============================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS PARA TENANTS
-- ============================================

-- Los usuarios solo ven su propio tenant
CREATE POLICY "Users can view their own tenant"
    ON tenants FOR SELECT
    USING (id = get_current_tenant_id() OR is_admin());

-- Solo admins pueden crear tenants
CREATE POLICY "Only admins can create tenants"
    ON tenants FOR INSERT
    WITH CHECK (is_admin());

-- Solo owners pueden actualizar su tenant
CREATE POLICY "Owners can update their tenant"
    ON tenants FOR UPDATE
    USING (id = get_current_tenant_id() AND (is_owner() OR is_admin()))
    WITH CHECK (id = get_current_tenant_id() AND (is_owner() OR is_admin()));

-- ============================================
-- 3. POLÍTICAS PARA PROFILES
-- ============================================

-- Usuarios ven perfiles de su tenant
CREATE POLICY "Users can view profiles in their tenant"
    ON profiles FOR SELECT
    USING (tenant_id = get_current_tenant_id() OR is_admin());

-- El usuario puede ver y editar su propio perfil
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Solo owners pueden crear staff en su tenant
CREATE POLICY "Owners can create staff"
    ON profiles FOR INSERT
    WITH CHECK (
        (tenant_id = get_current_tenant_id() AND is_owner() AND is_tenant_active())
        OR is_admin()
    );

-- Solo owners pueden eliminar staff
CREATE POLICY "Owners can delete staff"
    ON profiles FOR DELETE
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_owner() 
        AND id != auth.uid() -- No puede eliminarse a sí mismo
    );

-- ============================================
-- 4. POLÍTICAS PARA PRODUCTS
-- ============================================

-- Todos los usuarios del tenant pueden ver productos
CREATE POLICY "Users can view products in their tenant"
    ON products FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Solo si el tenant está activo pueden modificar
CREATE POLICY "Active tenant can create products"
    ON products FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_active()
    );

CREATE POLICY "Active tenant can update products"
    ON products FOR UPDATE
    USING (tenant_id = get_current_tenant_id() AND is_tenant_active())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_active());

-- Solo owners pueden eliminar (soft delete recomendado)
CREATE POLICY "Owners can delete products"
    ON products FOR DELETE
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_owner()
        AND is_tenant_active()
    );

-- ============================================
-- 5. POLÍTICAS PARA SALES
-- ============================================

-- Todos pueden ver ventas del tenant
CREATE POLICY "Users can view sales in their tenant"
    ON sales FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Solo tenants activos pueden crear ventas
CREATE POLICY "Active tenant can create sales"
    ON sales FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_active()
    );

-- No se permiten updates ni deletes (historial inmutable)
-- Si necesitas anulaciones, crear tabla sale_cancellations

-- ============================================
-- 6. POLÍTICAS PARA SALE_ITEMS
-- ============================================

CREATE POLICY "Users can view sale items in their tenant"
    ON sale_items FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Active tenant can create sale items"
    ON sale_items FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_active()
    );

-- ============================================
-- 7. POLÍTICAS PARA INVENTORY_MOVEMENTS
-- ============================================

CREATE POLICY "Users can view inventory movements"
    ON inventory_movements FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Active tenant can create movements"
    ON inventory_movements FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_active()
    );

-- Solo owners pueden crear ajustes manuales
-- (Las ventas crean movimientos automáticamente via función)

-- ============================================
-- 8. POLÍTICAS PARA SUBSCRIPTIONS
-- ============================================

-- Owners pueden ver su suscripción
CREATE POLICY "Users can view their subscription"
    ON subscriptions FOR SELECT
    USING (tenant_id = get_current_tenant_id() OR is_admin());

-- Solo admins pueden modificar suscripciones
CREATE POLICY "Only admins can manage subscriptions"
    ON subscriptions FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can create subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (is_admin());

-- ============================================
-- 9. GRANTS PARA FUNCIONES
-- ============================================

-- Dar acceso a las funciones RPC
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_active() TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_suspended() TO authenticated;
GRANT EXECUTE ON FUNCTION process_sale(JSONB, payment_method, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_status() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_payment_received(UUID, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_user_to_tenant(UUID, UUID, TEXT, TEXT, user_role) TO authenticated;

-- ============================================
-- FIN DEL SCRIPT RLS
-- ============================================
