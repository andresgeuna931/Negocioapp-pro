'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { TrialBanner } from '@/components/subscriptions/trial-banner';
import type { UserSession } from '@/lib/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    session: UserSession | null;
}

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Calculate trial status from created_at (consistent with layout.tsx and page.tsx)
    const tenant = session?.tenant;
    const createdAt = tenant?.created_at ? new Date(tenant.created_at) : null;
    const isActive = tenant?.status && ['active'].includes(tenant.status);

    let isTrial = false;
    let daysRemaining = 0;

    if (createdAt && !isActive) {
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        const now = new Date();
        daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isTrial = tenant?.status === 'trial' && daysRemaining > 0;
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

                {session?.tenant && (
                    <TrialBanner
                        isTrial={isTrial}
                        daysRemaining={daysRemaining}
                    />
                )}

                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
