-- =============================================
-- MIGRACIÓN: CONTROL DE CAJA
-- =============================================

-- Tabla de sesiones de caja
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
    actual_cash DECIMAL(12,2),
    difference DECIMAL(12,2),
    total_sales_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_sales_other DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_withdrawals DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deposits DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de movimientos de caja
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'withdrawal', 'deposit', 'expense')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant ON cash_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);

-- RLS (Row Level Security)
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para cash_sessions
CREATE POLICY "Usuarios pueden ver sesiones de su tenant"
ON cash_sessions FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios pueden crear sesiones en su tenant"
ON cash_sessions FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios pueden actualizar sesiones de su tenant"
ON cash_sessions FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Políticas para cash_movements
CREATE POLICY "Usuarios pueden ver movimientos de su tenant"
ON cash_movements FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios pueden crear movimientos en su tenant"
ON cash_movements FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Trigger para auto-llenar tenant_id
CREATE OR REPLACE FUNCTION set_tenant_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (SELECT tenant_id FROM profiles WHERE id = auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_cash_sessions_tenant_id
    BEFORE INSERT ON cash_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_from_user();

CREATE TRIGGER set_cash_movements_tenant_id
    BEFORE INSERT ON cash_movements
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_from_user();
