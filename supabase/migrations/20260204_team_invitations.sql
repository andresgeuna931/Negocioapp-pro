-- =============================================
-- TEAM INVITATIONS TABLE
-- Run this in Supabase SQL Editor
-- =============================================

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff', 'admin')),
    invited_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see invitations for their tenant
CREATE POLICY "Users can view own tenant invitations"
    ON public.team_invitations
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy: Only owners can create invitations
CREATE POLICY "Owners can create invitations"
    ON public.team_invitations
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Policy: Only owners can update invitations
CREATE POLICY "Owners can update invitations"
    ON public.team_invitations
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant 
    ON public.team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email 
    ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status 
    ON public.team_invitations(status);

-- =============================================
-- FUNCTION: Accept invitation when user registers
-- =============================================

CREATE OR REPLACE FUNCTION public.accept_invitation_on_register()
RETURNS TRIGGER AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Check if there's a pending invitation for this email
    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > NOW()
    LIMIT 1;

    -- If invitation exists, update the new profile
    IF FOUND THEN
        -- Update the profile with invited tenant and role
        UPDATE public.profiles
        SET tenant_id = v_invitation.tenant_id,
            role = v_invitation.role,
            full_name = v_invitation.full_name
        WHERE id = NEW.id;

        -- Mark invitation as accepted
        UPDATE public.team_invitations
        SET status = 'accepted',
            updated_at = NOW()
        WHERE id = v_invitation.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after profile is created
DROP TRIGGER IF EXISTS on_profile_created_check_invitation ON public.profiles;
CREATE TRIGGER on_profile_created_check_invitation
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.accept_invitation_on_register();
