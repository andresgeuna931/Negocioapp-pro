'use client';

import { ReactNode, useState } from 'react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Header } from '@/components/layout/header';
import type { UserSession } from '@/lib/types';

interface AdminLayoutClientProps {
    children: ReactNode;
    session: UserSession | null;
}

export function AdminLayoutClient({ children, session }: AdminLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <AdminSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            
            <div className="lg:pl-72 flex flex-col min-h-screen transition-all duration-300">
                <Header 
                    onMenuClick={() => setIsSidebarOpen(true)} 
                    session={session}
                />
                
                <main className="flex-1 p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
