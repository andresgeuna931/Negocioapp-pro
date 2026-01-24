-- Migration: 005_subscriptions.sql
-- Feature: Subscriptions System & Tenant Limits

-- Enum for subscription status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'unpaid');

-- Enum for plans (optional validation, mostly handled in app logic but good for data integrity)
CREATE TYPE plan_type AS ENUM ('starter', 'professional', 'business');

-- Modify tenants table to include subscription info
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_type plan_type NOT NULL DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_customer_id TEXT;

-- Table: subscriptions (for keeping track of MP subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mercadopago_subscription_id TEXT, -- preapproval_id form MP
    plan_id plan_type NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_id ON subscriptions(mercadopago_subscription_id);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant subscriptions"
    ON subscriptions FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- Function to update tenant status when subscription changes
-- This logic usually lives in the application (webhook handler), 
-- but we can have a trigger to keep things consistent if needed.
-- For now, we will rely on the application to update both tables.

-- Default 'Professional' Trial for new tenants (Trigger on tenant creation)
-- NOTE: We already have tenants created. This trigger is for FUTURE tenants.
-- For existing tenants, we will run a migration script manually or below.

CREATE OR REPLACE FUNCTION set_default_trial()
RETURNS TRIGGER AS $$
BEGIN
    NEW.plan_type := 'professional';
    NEW.subscription_status := 'trial';
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only attach this trigger if we want ALL new signups to start on Trial
-- Since existing logic might just create a tenant, let's keep it safe.
-- We will enable this trigger.
DROP TRIGGER IF EXISTS trigger_set_default_trial ON tenants;
CREATE TRIGGER trigger_set_default_trial
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION set_default_trial();

-- Update existing tenants to have a valid state if they are null (defensive)
-- We set them to 'starter' active by default as they are legacy users
UPDATE tenants 
SET plan_type = 'starter', subscription_status = 'active' 
WHERE plan_type IS NULL;
