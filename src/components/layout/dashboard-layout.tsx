'use client';

import { useState } from 'react';
import { differenceInDays } from 'date-fns';
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

    // Calculate trial status
    const isTrial = session?.tenant?.subscription_status === 'trial';
    const trialEndsAt = session?.tenant?.trial_ends_at; // Use tenant status from migration

    let daysRemaining = 0;
    if (trialEndsAt) {
        daysRemaining = differenceInDays(new Date(trialEndsAt), new Date());
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
