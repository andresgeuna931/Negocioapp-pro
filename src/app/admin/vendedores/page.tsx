import { getSellers, getUnassignedTenants } from '@/lib/actions/sellers';
import { SellersClient } from '@/components/admin/sellers-client';

export const dynamic = 'force-dynamic';

export default async function VendedoresPage() {
    const { sellers = [] } = await getSellers();
    const { tenants: unassignedTenants = [] } = await getUnassignedTenants();

    // Calcular comisión mensual por vendedor
    const sellersWithMetrics = sellers.map((seller: any) => {
        const assignments = seller.seller_assignments ?? [];
        const activeAssignments = assignments.filter((a: any) => {
            const sub = a.tenant?.subscriptions?.[0];
            return sub?.status === 'active';
        });

        const monthlyRevenue = activeAssignments.reduce((acc: number, a: any) => {
            const planId = a.tenant?.subscriptions?.[0]?.plan_id ?? '';
            // Precios base por plan
            const planPrices: Record<string, number> = {
                starter: 19000,
                professional: 39000,
                business: 49000,
            };
            return acc + (planPrices[planId] ?? 0);
        }, 0);

        const monthlyCommission = Math.round(monthlyRevenue * (seller.commission_pct / 100));

        return {
            ...seller,
            activeClients: activeAssignments.length,
            totalClients: assignments.length,
            monthlyRevenue,
            monthlyCommission,
        };
    });

    // Stat tiles globales
    const totalMonthlyCommissions = sellersWithMetrics.reduce(
        (acc: number, s: any) => acc + s.monthlyCommission, 0
    );
    const totalActiveClients = sellersWithMetrics.reduce(
        (acc: number, s: any) => acc + s.activeClients, 0
    );

    return (
        <SellersClient
            sellers={sellersWithMetrics}
            unassignedTenants={unassignedTenants}
            totalMonthlyCommissions={totalMonthlyCommissions}
            totalActiveClients={totalActiveClients}
        />
    );
}
