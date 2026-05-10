import { ReactNode } from 'react';
import { AdminLayoutClient } from './admin-layout-client';
import { requireAdmin } from '@/lib/actions/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // 1. Protection: Only admins can pass this
    const session = await requireAdmin();

    return (
        <AdminLayoutClient session={session}>
            {children}
        </AdminLayoutClient>
    );
}
