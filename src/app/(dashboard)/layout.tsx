import { DashboardLayout } from '@/components/layout';
import { getCurrentSession } from '@/lib/actions/auth';

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getCurrentSession();

    return (
        <DashboardLayout session={session}>
            {children}
        </DashboardLayout>
    );
}
