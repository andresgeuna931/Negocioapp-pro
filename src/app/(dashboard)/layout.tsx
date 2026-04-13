import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { getCurrentSession } from '@/lib/actions/auth';

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

    // Calculate subscription state (passed down to components)
    const tenant = session.tenant;
    let isExpired = false;
    let daysRemaining = 0;

    if (tenant) {
        const now = new Date();
        const createdAt = new Date(tenant.created_at);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const isActive = tenant.status === 'active';
        const isInTrial = tenant.status === 'trial' && now < trialEndDate;

        if (isInTrial) {
            daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Expired = trial period over AND no active paid subscription
        isExpired = !isActive && !isInTrial;
    }

    return (
        <DashboardLayout session={session} isExpired={isExpired} daysRemaining={daysRemaining}>
            {children}
        </DashboardLayout>
    );
}
