-- ============================================
-- SISTEMA KIOSCO BARRIAL - DATOS DE PRUEBA
-- ============================================
-- Datos de seed para desarrollo y testing
-- Ejecutar DESPUÉS de schema.sql y rls_policies.sql
-- ============================================

-- Nota: Los usuarios deben crearse primero en Supabase Auth
-- Este script asume que ya tienes usuarios creados

-- ============================================
-- 1. CREAR TENANT DE PRUEBA
-- ============================================

INSERT INTO tenants (id, name, slug, status, low_stock_threshold_default, address, phone)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Kiosco Don Pedro',
    'kiosco-don-pedro',
    'active',
    5,
    'Av. Corrientes 1234, CABA',
    '11-4444-5555'
);

-- ============================================
-- 2. CREAR SUSCRIPCIÓN
-- ============================================

INSERT INTO subscriptions (tenant_id, plan, status, current_period_end)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'basic',
    'active',
    NOW() + INTERVAL '30 days'
);

-- ============================================
-- 3. PRODUCTOS DE PRUEBA
-- ============================================

-- Bebidas
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Coca Cola 500ml', '7790895000058', 'unit', 1500.00, 1000.00, 24, 'Bebidas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sprite 500ml', '7790895000065', 'unit', 1500.00, 1000.00, 18, 'Bebidas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Agua Mineral 500ml', '7790895000072', 'unit', 800.00, 500.00, 36, 'Bebidas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cerveza Quilmes 1L', '7790895000089', 'unit', 2500.00, 1800.00, 12, 'Bebidas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fernet Branca 750ml', '7790895000096', 'unit', 15000.00, 11000.00, 6, 'Bebidas');

-- Golosinas
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alfajor Havanna', '7790895001000', 'unit', 1200.00, 800.00, 20, 'Golosinas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alfajor Cachafaz', '7790895001017', 'unit', 900.00, 600.00, 30, 'Golosinas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Chicle Beldent x3', '7790895001024', 'unit', 500.00, 300.00, 50, 'Golosinas'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Caramelos Sugus x10', '7790895001031', 'unit', 400.00, 250.00, 40, 'Golosinas');

-- Fiambres (por kg)
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Jamón Cocido', '7790895002000', 'kg', 8500.00, 6000.00, 3.5, 'Fiambres'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Queso Cremoso', '7790895002017', 'kg', 7000.00, 5000.00, 4.2, 'Fiambres'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Salame', '7790895002024', 'kg', 12000.00, 9000.00, 2.0, 'Fiambres');

-- Panadería
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pan Francés', '7790895003000', 'kg', 2000.00, 1200.00, 5.0, 'Panadería'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Medialunas x6', '7790895003017', 'unit', 1800.00, 1000.00, 10, 'Panadería'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Facturas Surtidas x6', '7790895003024', 'unit', 2200.00, 1400.00, 8, 'Panadería');

-- Productos con stock bajo (para probar alertas)
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category, low_stock_threshold_override) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cigarrillos Marlboro', '7790895004000', 'unit', 3500.00, 2800.00, 3, 'Tabaco', 10),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Encendedor BIC', '7790895004017', 'unit', 800.00, 500.00, 2, 'Tabaco', NULL);

-- Lácteos
INSERT INTO products (tenant_id, name, barcode, unit_type, price, cost, stock_on_hand, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Leche La Serenísima 1L', '7790895005000', 'unit', 1200.00, 900.00, 15, 'Lácteos'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Yogur Activia x4', '7790895005017', 'unit', 2500.00, 1800.00, 8, 'Lácteos'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Manteca 200g', '7790895005024', 'unit', 1800.00, 1300.00, 6, 'Lácteos');

-- ============================================
-- 4. SEGUNDO TENANT (para probar aislamiento)
-- ============================================

INSERT INTO tenants (id, name, slug, status, low_stock_threshold_default)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Almacén María',
    'almacen-maria',
    'trial',
    3
);

INSERT INTO subscriptions (tenant_id, plan, status, trial_ends_at, current_period_end)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'basic',
    'trial',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days'
);

INSERT INTO products (tenant_id, name, barcode, unit_type, price, stock_on_hand, category) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Arroz 1kg', '7791234000001', 'unit', 1500.00, 20, 'Almacén'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Fideos 500g', '7791234000002', 'unit', 800.00, 30, 'Almacén'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Aceite 1L', '7791234000003', 'unit', 2000.00, 10, 'Almacén');

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- Para completar el setup necesitas:
-- 1. Crear usuarios en Supabase Auth (Dashboard > Authentication > Users)
-- 2. Ejecutar estas queries para vincularlos:
--
-- -- Para el owner del primer kiosco:
-- SELECT link_user_to_tenant(
--     'USER_ID_FROM_AUTH',  -- El UUID del usuario
--     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
--     'Pedro García',
--     'pedro@kiosco.com',
--     'owner'
-- );
--
-- -- Para un staff:
-- SELECT link_user_to_tenant(
--     'STAFF_USER_ID',
--     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
--     'Juan Empleado',
--     'juan@kiosco.com',
--     'staff'
-- );
-- ============================================
