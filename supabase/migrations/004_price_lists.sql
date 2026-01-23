-- Migration: 004_price_lists.sql
-- Feature: Multiple Price Lists (Efectivo, Tarjeta, Mayorista, etc.)

-- Table: price_lists
-- Stores different price list configurations per tenant
CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    adjustment_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    adjustment_value DECIMAL(10,2) DEFAULT 0,         -- e.g., 5 for +5% or 50 for +$50
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: product_prices
-- Stores specific prices for products in each price list
CREATE TABLE IF NOT EXISTS product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, price_list_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant ON price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_active ON price_lists(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_list ON product_prices(price_list_id);

-- RLS Policies for price_lists
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant price lists"
    ON price_lists FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert price lists for their tenant"
    ON price_lists FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their tenant price lists"
    ON price_lists FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their tenant price lists"
    ON price_lists FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for product_prices
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product prices for their products"
    ON product_prices FOR SELECT
    USING (product_id IN (
        SELECT id FROM products WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert product prices for their products"
    ON product_prices FOR INSERT
    WITH CHECK (product_id IN (
        SELECT id FROM products WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update product prices for their products"
    ON product_prices FOR UPDATE
    USING (product_id IN (
        SELECT id FROM products WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete product prices for their products"
    ON product_prices FOR DELETE
    USING (product_id IN (
        SELECT id FROM products WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- Function to ensure only one default price list per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_price_list()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE price_lists 
        SET is_default = false 
        WHERE tenant_id = NEW.tenant_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_price_list
    BEFORE INSERT OR UPDATE ON price_lists
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_price_list();

-- Insert default price list for existing tenants
INSERT INTO price_lists (tenant_id, name, description, is_default, sort_order)
SELECT id, 'Efectivo', 'Precio base para pagos en efectivo', true, 0
FROM tenants
WHERE id NOT IN (SELECT DISTINCT tenant_id FROM price_lists);
