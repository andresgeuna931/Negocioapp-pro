'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { UserSession } from '@/lib/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    session: UserSession | null;
}

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
