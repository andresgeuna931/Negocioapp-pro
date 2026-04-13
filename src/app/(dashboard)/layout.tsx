import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { getCurrentSession } from '@/lib/actions/auth';

// Routes allowed even when subscription is expired
const ALLOWED_WHEN_EXPIRED = ['/precios', '/suscripcion-vencida', '/config', '/ayuda'];

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getCurrentSession();

    // If no session, middleware should have redirected, but just in case
    if (!session) {
        redirect('/login');
    }

    // Check subscription/trial status
    const tenant = session.tenant;
    if (tenant) {
        const now = new Date();
        const createdAt = new Date(tenant.created_at);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const isInTrial = tenant.status === 'trial' && now < trialEndDate;
        const isActive = tenant.status === 'active';

        // Block if trial expired AND no active subscription
        if (!isActive && !isInTrial) {
            // We can't check pathname here directly, so the redirect page 
            // itself should be outside the (dashboard) group or handled separately
            redirect('/suscripcion-vencida');
        }
    }

    return (
        <DashboardLayout session={session}>
            {children}
        </DashboardLayout>
    );
}

