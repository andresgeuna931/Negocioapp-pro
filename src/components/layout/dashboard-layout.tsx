'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { TrialBanner } from '@/components/subscriptions/trial-banner';
import { TawkToWidget } from '@/components/tawk-to';
import type { UserSession } from '@/lib/types';
import { getPlanDetails } from '@/lib/config/plans';

interface DashboardLayoutProps {
    children: React.ReactNode;
    session: UserSession | null;
    isExpired?: boolean;
    daysRemaining?: number;
}

export function DashboardLayout({ children, session, isExpired = false, daysRemaining = 0 }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Calculate trial status
    const tenant = session?.tenant;
    const subscription = session?.subscription;
    const createdAt = tenant?.created_at ? new Date(tenant.created_at) : null;
    const isActive = tenant?.status === 'active';

    let isTrial = false;

    if (createdAt && !isActive) {
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        const now = new Date();
        const remaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isTrial = tenant?.status === 'trial' && remaining > 0;
        if (isTrial) {
            daysRemaining = remaining;
        }
    }

    // Check if user has a PAID subscription (active subscription with a real plan)
    const hasPaidSubscription = !!(
        subscription &&
        subscription.status === 'active' &&
        subscription.plan &&
        !['free', 'trial'].includes(subscription.plan)
    );

    // Get plan name for display
    const paidPlanName = hasPaidSubscription && subscription?.plan
        ? getPlanDetails(subscription.plan).name
        : undefined;

    // Calculate subscription days remaining
    let subscriptionDaysLeft: number | undefined = undefined;
    if (hasPaidSubscription && subscription?.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        subscriptionDaysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content */}
            <div className="lg:pl-72">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    session={session}
                />

                {/* Trial/Expired/Subscription banners */}
                {session?.tenant && (
                    <TrialBanner
                        isTrial={isTrial}
                        isExpired={isExpired}
                        daysRemaining={daysRemaining}
                        hasPaidSubscription={hasPaidSubscription}
                        paidPlanName={paidPlanName}
                        subscriptionDaysLeft={subscriptionDaysLeft}
                    />
                )}

                <main className="p-4 lg:p-6 relative">
                    {/* Overlay that blocks interactions when expired and NO paid subscription */}
                    {isExpired && !hasPaidSubscription && (
                        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] z-10 rounded-lg pointer-events-none" />
                    )}
                    {children}
                </main>
            </div>

            <TawkToWidget />
        </div>
    );
}
