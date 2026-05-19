import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { getCurrentSession } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { verifySubscriptionWithMP } from '@/lib/actions/verify-subscription';

// Prevent Next.js from caching this layout — subscription status must always be fresh
export const dynamic = 'force-dynamic';

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let session = await getCurrentSession();

    if (!session) {
        redirect('/login');
    }

    // --- FRESH DATA FETCH (Reliable for re-registration) ---
    const supabase = await createClient();
    
    // 1. Get fresh profile (to get correct tenant_id)
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) {
        redirect('/login');
    }

    // 2. Get fresh tenant data
    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

    // 3. Get fresh subscription data
    let { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .single();

    // Update session object for the rest of the app
    if (tenant) {
        session.tenant = tenant;
    }

    // Override session subscription with direct query result
    if (subscription) {
        session.subscription = subscription;
    }

    // ─── BACKUP VERIFICATION ───────────────────────────────────────
    // If tenant is still in 'trial', check directly with MercadoPago API.
    // This catches cases where the webhook failed or hasn't arrived yet.
    // Only runs while tenant is in trial — once activated, this is skipped.
    if (session.tenant.status === 'trial') {
        const verification = await verifySubscriptionWithMP(session.tenant.id);
        if (verification.found && verification.status === 'active') {
            // Re-fetch directamente de DB, sin pasar por getCurrentSession()
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
    // ────────────────────────────────────────────────────────────────

    // Calculate subscription state
    let isExpired = false;
    let daysRemaining = 0;

    const now = new Date();
    const createdAt = new Date(tenant.created_at);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const isActive = tenant.status === 'active';
    const isInTrial = tenant.status === 'trial' && now < trialEndDate;

    if (isInTrial) {
        daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Check if has paid subscription (independently of tenant status)
    const hasPaidSub = isActive || !!(
        subscription &&
        subscription.status === 'active' &&
        subscription.plan &&
        !['free', 'trial'].includes(subscription.plan)
    );

    // Expired = trial over AND no active paid subscription
    isExpired = !isActive && !isInTrial && !hasPaidSub;

    return (
        <DashboardLayout session={session} isExpired={isExpired} daysRemaining={daysRemaining}>
            {children}
        </DashboardLayout>
    );
}
