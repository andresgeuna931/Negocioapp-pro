-- ============================================
-- SISTEMA KIOSCO BARRIAL - ESQUEMA DE BASE DE DATOS
-- ============================================
-- Multi-tenant SaaS para kioscos de barrio
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. TIPOS ENUMERADOS
-- ============================================

-- Estado del tenant/suscripción
CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'canceled');

-- Rol del usuario
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'admin');

-- Tipo de unidad de medida
CREATE TYPE unit_type AS ENUM ('unit', 'kg', 'g', 'lt', 'ml');

-- Método de pago
CREATE TYPE payment_method AS ENUM ('cash', 'debit', 'credit', 'transfer', 'mixed');

-- Tipo de movimiento de inventario
CREATE TYPE movement_type AS ENUM ('sale', 'adjustment', 'purchase', 'return');

-- Estado de suscripción
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'canceled');

-- Plan de suscripción
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium');

-- ============================================
-- 3. TABLAS
-- ============================================

-- ----------------------------------------
-- TENANTS (Negocios/Kioscos)
-- ----------------------------------------
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status tenant_status NOT NULL DEFAULT 'trial',
    low_stock_threshold_default NUMERIC(10,2) NOT NULL DEFAULT 5,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ----------------------------------------
-- PROFILES (Usuarios extendidos)
-- ----------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'staff',
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ----------------------------------------
-- PRODUCTS (Productos)
-- ----------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    unit_type unit_type NOT NULL DEFAULT 'unit',
    price NUMERIC(12,2) NOT NULL,
    cost NUMERIC(12,2),
    stock_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
    low_stock_threshold_override NUMERIC(10,2),
    category TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- SKU único por tenant
    CONSTRAINT unique_sku_per_tenant UNIQUE (tenant_id, sku),
    -- Barcode único por tenant
    CONSTRAINT unique_barcode_per_tenant UNIQUE (tenant_id, barcode)
);

-- Índices
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_stock ON products(stock_on_hand);

-- ----------------------------------------
-- SALES (Ventas)
-- ----------------------------------------
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sold_by UUID NOT NULL REFERENCES profiles(id),
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_sold_by ON sales(sold_by);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_tenant_date ON sales(tenant_id, created_at DESC);

-- ----------------------------------------
-- SALE_ITEMS (Items de venta)
-- ----------------------------------------
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL, -- Snapshot del nombre
    qty NUMERIC(12,3) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sale_items_tenant ON sale_items(tenant_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ----------------------------------------
-- INVENTORY_MOVEMENTS (Movimientos de inventario)
-- ----------------------------------------
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type movement_type NOT NULL,
    qty_change NUMERIC(12,3) NOT NULL, -- Negativo para ventas
    stock_before NUMERIC(12,3) NOT NULL,
    stock_after NUMERIC(12,3) NOT NULL,
    reference_id UUID, -- sale_id o adjustment_id
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_inventory_movements_tenant ON inventory_movements(tenant_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at DESC);

-- ----------------------------------------
-- SUBSCRIPTIONS (Suscripciones)
-- ----------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL DEFAULT 'basic',
    status subscription_status NOT NULL DEFAULT 'trial',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    last_payment_at TIMESTAMPTZ,
    last_payment_amount NUMERIC(12,2),
    payment_provider TEXT, -- 'mercadopago', 'stripe', 'manual'
    external_subscription_id TEXT, -- ID del proveedor de pagos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================
-- 4. FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener el tenant_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Función para verificar si el usuario es owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'owner'
    )
$$;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
$$;

-- Función para verificar si el tenant está activo (puede escribir)
CREATE OR REPLACE FUNCTION is_tenant_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenants t
        JOIN profiles p ON p.tenant_id = t.id
        WHERE p.id = auth.uid() 
        AND t.status IN ('trial', 'active')
    )
$$;

-- Función para verificar si el tenant está suspendido
CREATE OR REPLACE FUNCTION is_tenant_suspended()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenants t
        JOIN profiles p ON p.tenant_id = t.id
        WHERE p.id = auth.uid() 
        AND t.status = 'suspended'
    )
$$;

-- ============================================
-- 5. TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. FUNCIÓN PARA PROCESAR VENTA
-- ============================================

CREATE OR REPLACE FUNCTION process_sale(
    p_items JSONB,
    p_payment_method payment_method,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_sale_id UUID;
    v_total NUMERIC(12,2) := 0;
    v_item JSONB;
    v_product RECORD;
    v_qty NUMERIC(12,3);
    v_line_total NUMERIC(12,2);
    v_stock_before NUMERIC(12,3);
BEGIN
    -- Obtener tenant_id y user_id
    SELECT tenant_id, id INTO v_tenant_id, v_user_id
    FROM profiles WHERE id = auth.uid();
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no asociado a un negocio';
    END IF;
    
    -- Verificar que el tenant esté activo
    IF NOT is_tenant_active() THEN
        RAISE EXCEPTION 'El negocio está suspendido. No se pueden registrar ventas.';
    END IF;
    
    -- Validar items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe tener al menos un producto';
    END IF;
    
    -- Calcular total y validar stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        
        SELECT * INTO v_product 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID 
        AND tenant_id = v_tenant_id
        AND is_active = true;
        
        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Producto no encontrado o inactivo: %', v_item->>'product_id';
        END IF;
        
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Cantidad debe ser mayor a 0 para: %', v_product.name;
        END IF;
        
        IF v_product.stock_on_hand < v_qty THEN
            RAISE EXCEPTION 'Stock insuficiente para %: disponible %.3f, solicitado %.3f', 
                v_product.name, v_product.stock_on_hand, v_qty;
        END IF;
        
        v_line_total := v_qty * v_product.price;
        v_total := v_total + v_line_total;
    END LOOP;
    
    -- Crear la venta
    INSERT INTO sales (tenant_id, sold_by, total_amount, payment_method, notes)
    VALUES (v_tenant_id, v_user_id, v_total, p_payment_method, p_notes)
    RETURNING id INTO v_sale_id;
    
    -- Procesar cada item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        
        SELECT * INTO v_product 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID;
        
        v_line_total := v_qty * v_product.price;
        v_stock_before := v_product.stock_on_hand;
        
        -- Insertar item de venta
        INSERT INTO sale_items (tenant_id, sale_id, product_id, product_name, qty, unit_price, line_total)
        VALUES (v_tenant_id, v_sale_id, v_product.id, v_product.name, v_qty, v_product.price, v_line_total);
        
        -- Actualizar stock
        UPDATE products 
        SET stock_on_hand = stock_on_hand - v_qty
        WHERE id = v_product.id;
        
        -- Registrar movimiento de inventario
        INSERT INTO inventory_movements (
            tenant_id, product_id, type, qty_change, 
            stock_before, stock_after, reference_id, created_by
        )
        VALUES (
            v_tenant_id, v_product.id, 'sale', -v_qty,
            v_stock_before, v_stock_before - v_qty, v_sale_id, v_user_id
        );
    END LOOP;
    
    RETURN v_sale_id;
END;
$$;

-- ============================================
-- 7. FUNCIÓN PARA OBTENER PRODUCTOS CON STOCK BAJO
-- ============================================

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
    id UUID,
    name TEXT,
    stock_on_hand NUMERIC,
    threshold NUMERIC,
    unit_type unit_type
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        p.id,
        p.name,
        p.stock_on_hand,
        COALESCE(p.low_stock_threshold_override, t.low_stock_threshold_default) as threshold,
        p.unit_type
    FROM products p
    JOIN tenants t ON t.id = p.tenant_id
    WHERE p.tenant_id = get_current_tenant_id()
    AND p.is_active = true
    AND p.stock_on_hand <= COALESCE(p.low_stock_threshold_override, t.low_stock_threshold_default)
    ORDER BY p.stock_on_hand ASC
$$;

-- ============================================
-- 8. FUNCIÓN PARA REPORTES
-- ============================================

-- Resumen de ventas por período
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_period TEXT DEFAULT 'today' -- 'today', 'week', 'month', 'year'
)
RETURNS TABLE (
    total_sales BIGINT,
    total_amount NUMERIC,
    average_sale NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*)::BIGINT as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_sale
    FROM sales
    WHERE tenant_id = get_current_tenant_id()
    AND created_at >= CASE p_period
        WHEN 'today' THEN DATE_TRUNC('day', NOW())
        WHEN 'week' THEN DATE_TRUNC('week', NOW())
        WHEN 'month' THEN DATE_TRUNC('month', NOW())
        WHEN 'year' THEN DATE_TRUNC('year', NOW())
        ELSE DATE_TRUNC('day', NOW())
    END
$$;

-- Top productos vendidos
CREATE OR REPLACE FUNCTION get_top_products(
    p_limit INT DEFAULT 5,
    p_period TEXT DEFAULT 'month'
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    total_qty NUMERIC,
    total_revenue NUMERIC,
    unit_type unit_type
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        si.product_id,
        si.product_name,
        SUM(si.qty) as total_qty,
        SUM(si.line_total) as total_revenue,
        p.unit_type
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
    WHERE si.tenant_id = get_current_tenant_id()
    AND s.created_at >= CASE p_period
        WHEN 'today' THEN DATE_TRUNC('day', NOW())
        WHEN 'week' THEN DATE_TRUNC('week', NOW())
        WHEN 'month' THEN DATE_TRUNC('month', NOW())
        WHEN 'year' THEN DATE_TRUNC('year', NOW())
        ELSE DATE_TRUNC('month', NOW())
    END
    GROUP BY si.product_id, si.product_name, p.unit_type
    ORDER BY total_revenue DESC
    LIMIT p_limit
$$;

-- ============================================
-- 9. FUNCIÓN PARA CREAR TENANT CON OWNER
-- ============================================

CREATE OR REPLACE FUNCTION create_tenant_with_owner(
    p_tenant_name TEXT,
    p_tenant_slug TEXT,
    p_owner_email TEXT,
    p_owner_password TEXT,
    p_owner_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Solo admins pueden crear tenants
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden crear negocios';
    END IF;
    
    -- Crear tenant
    INSERT INTO tenants (name, slug)
    VALUES (p_tenant_name, p_tenant_slug)
    RETURNING id INTO v_tenant_id;
    
    -- Crear suscripción trial
    INSERT INTO subscriptions (tenant_id, plan, status)
    VALUES (v_tenant_id, 'basic', 'trial');
    
    RETURN jsonb_build_object(
        'tenant_id', v_tenant_id,
        'message', 'Tenant creado. Ahora cree el usuario owner en Supabase Auth y luego llame a link_user_to_tenant.'
    );
END;
$$;

-- Función para vincular usuario existente a tenant
CREATE OR REPLACE FUNCTION link_user_to_tenant(
    p_user_id UUID,
    p_tenant_id UUID,
    p_full_name TEXT,
    p_email TEXT,
    p_role user_role DEFAULT 'owner'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, tenant_id, role, full_name, email)
    VALUES (p_user_id, p_tenant_id, p_role, p_full_name, p_email);
    
    RETURN p_user_id;
END;
$$;

-- ============================================
-- 10. FUNCIÓN PARA ACTUALIZAR ESTADO DE SUSCRIPCIÓN
-- ============================================

CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Marcar como past_due si venció hace menos de 7 días
    UPDATE subscriptions
    SET status = 'past_due'
    WHERE status = 'active'
    AND current_period_end < NOW()
    AND current_period_end > NOW() - INTERVAL '7 days';
    
    -- Marcar como suspended si venció hace más de 7 días
    UPDATE subscriptions
    SET status = 'suspended'
    WHERE status IN ('active', 'past_due')
    AND current_period_end < NOW() - INTERVAL '7 days';
    
    -- Actualizar estado del tenant basado en suscripción
    UPDATE tenants t
    SET status = s.status::TEXT::tenant_status
    FROM subscriptions s
    WHERE s.tenant_id = t.id
    AND t.status != s.status::TEXT::tenant_status;
END;
$$;

-- Función para marcar pago manual
CREATE OR REPLACE FUNCTION mark_payment_received(
    p_tenant_id UUID,
    p_amount NUMERIC,
    p_months INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo admins pueden marcar pagos
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden registrar pagos';
    END IF;
    
    -- Actualizar suscripción
    UPDATE subscriptions
    SET 
        status = 'active',
        last_payment_at = NOW(),
        last_payment_amount = p_amount,
        current_period_start = NOW(),
        current_period_end = NOW() + (p_months || ' months')::INTERVAL,
        payment_provider = 'manual'
    WHERE tenant_id = p_tenant_id;
    
    -- Actualizar estado del tenant
    UPDATE tenants
    SET status = 'active'
    WHERE id = p_tenant_id;
END;
$$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
