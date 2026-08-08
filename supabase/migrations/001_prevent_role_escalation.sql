-- Trigger que previene escalación de rol y cambio de tenant_id
-- Ejecutado en: Supabase SQL Editor (producción)

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role <> OLD.role AND NOT is_admin() THEN
        RAISE EXCEPTION 'No tenés permiso para cambiar el rol';
    END IF;
    IF NEW.tenant_id <> OLD.tenant_id THEN
        RAISE EXCEPTION 'No tenés permiso para cambiar el tenant';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_role_escalation_prevention
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_escalation();
