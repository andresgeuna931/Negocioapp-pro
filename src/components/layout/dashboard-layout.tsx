'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { TrialBanner } from '@/components/subscriptions/trial-banner';
import { TawkToWidget } from '@/components/tawk-to';
import type { UserSession } from '@/lib/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    session: UserSession | null;
    isExpired?: boolean;
    daysRemaining?: number;
}

export function DashboardLayout({ children, session, isExpired = false, daysRemaining = 0 }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Calculate trial status from created_at
    const tenant = session?.tenant;
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content */}
            <div className="lg:pl-72">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    session={session}
                />

                {/* Trial/Expired banners */}
                {session?.tenant && (
                    <TrialBanner
                        isTrial={isTrial}
                        isExpired={isExpired}
                        daysRemaining={daysRemaining}
                    />
                )}

                <main className="p-4 lg:p-6 relative">
                    {/* Overlay that blocks interactions when expired */}
                    {isExpired && (
                        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] z-10 rounded-lg pointer-events-none" />
                    )}
                    {children}
                </main>
            </div>

            <TawkToWidget />
        </div>
    );
}
