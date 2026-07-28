import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { getCurrentSession } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySubscriptionWithMP } from '@/lib/actions/verify-subscription';
import { getMaintenanceMode } from '@/lib/actions/system-settings';
import { PauseCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SUSPENDED_SCREEN = (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <PauseCircle className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
                Cuenta suspendida temporalmente
            </h1>
            <p className="text-slate-400 leading-relaxed">
                Tu cuenta está pausada en este momento. Comunicate con soporte para más información.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-600">NegocioApp Pro</p>
            </div>
        </div>
    </div>
);

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Verificar modo mantenimiento antes que todo
    const isMaintenanceOn = await getMaintenanceMode();
    if (isMaintenanceOn) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
                        <span className="text-4xl">🔧</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        App en mantenimiento
                    </h1>
                    <p className="text-slate-400 mb-6">
                        Estamos realizando mejoras. Volvé en unos minutos.
                    </p>
                    <p className="text-xs text-slate-600">
                        NegocioApp Pro
                    </p>
                </div>
            </div>
        );
    }

    let session = await getCurrentSession();

    if (!session) {
        redirect('/login');
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: profile } = await admin
        .from('profiles')
        .select('tenant_id, is_demo_disabled')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) {
        redirect('/login');
    }

    // ─── USUARIO DEMO DESHABILITADO ───────────────────────────────────────────
    if (profile?.is_demo_disabled && session.profile.role !== 'admin') {
        return SUSPENDED_SCREEN;
    }

    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

    let { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (tenant) {
        session.tenant = tenant;
    }

    if (subscription) {
        session.subscription = subscription;
    }

    // ─── PAUSA TEMPORAL DE TENANT ─────────────────────────────────────────────
    if (tenant?.is_paused && session.profile.role !== 'admin') {
        return SUSPENDED_SCREEN;
    }

    if (session.tenant.status === 'trial') {
        const verification = await verifySubscriptionWithMP(session.tenant.id);
        if (verification.found && verification.status === 'active') {
            const { data: freshTenant } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', session.tenant.id)
                .single();

            const { data: freshSub } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('tenant_id', session.tenant.id)
                .single();

            if (freshTenant) session.tenant = freshTenant;
            if (freshSub) session.subscription = freshSub;
        }
    }

    let isExpired = false;
    let daysRemaining = 0;

    const now = new Date();
    const createdAt = new Date(session.tenant.created_at);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const isActive = session.tenant.status === 'active';
    const isSuspended = session.tenant.status === 'suspended';
    const isInTrial = session.tenant.status === 'trial' && now < trialEndDate;

    if (isInTrial) {
        daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    isExpired = isSuspended || (!isActive && !isInTrial && !(
        session.subscription &&
        session.subscription.status === 'active' &&
        session.subscription.plan &&
        !['free', 'trial'].includes(session.subscription.plan)
    ));

    return (
        <DashboardLayout session={session} isExpired={isExpired} daysRemaining={daysRemaining}>
            {children}
        </DashboardLayout>
    );
}
