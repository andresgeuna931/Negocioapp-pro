-- Migration: 006_customers_and_accounts.sql
-- Feature: Customer Management & Current Accounts (Fiado)

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    dni VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    credit_limit DECIMAL(12,2) DEFAULT 0, -- 0 means no limit check? Or set a default high limit? Let's say 0 is strict no credit unless authorized.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: customer_accounts (One per customer)
CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0, -- Positive means debt (owes money), Negative means credit in favor (overpaid)
    last_movement_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Enum for account movement types
CREATE TYPE account_movement_type AS ENUM ('sale', 'payment', 'adjustment_debit', 'adjustment_credit');

-- Table: account_movements
CREATE TABLE IF NOT EXISTS account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    type account_movement_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Can be sale_id (if sale) or payment_id (if explicit payment record exists later)
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(tenant_id, full_name, dni);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_account ON account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_date ON account_movements(created_at);

-- RLS Policies for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant customers"
    ON customers FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert customers for their tenant"
    ON customers FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant customers"
    ON customers FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant customers"
    ON customers FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS account tables
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
-- (Same policies pattern) ...
CREATE POLICY "Users can view accounts" ON customer_accounts FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update accounts" ON customer_accounts FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view movements" ON account_movements FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert movements" ON account_movements FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Function to automatically create account when customer is created
CREATE OR REPLACE FUNCTION create_customer_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_accounts (tenant_id, customer_id, balance)
    VALUES (NEW.tenant_id, NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_customer_account
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION create_customer_account();

-- Function to update balance on movement
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- If type is sale or debit adj -> Increase debt (balance + amount)
    -- If type is payment or credit adj -> Decrease debt (balance - amount)
    
    IF NEW.type IN ('sale', 'adjustment_debit') THEN
        UPDATE customer_accounts 
        SET balance = balance + NEW.amount, last_movement_at = NOW(), updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSE
        UPDATE customer_accounts 
        SET balance = balance - NEW.amount, last_movement_at = NOW(), updated_at = NOW()
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT ON account_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();
