import { getSellers, getUnassignedTenants, getTotalMonthlyCommissions } from '@/lib/actions/sellers';
import { SellersClient } from '@/components/admin/sellers-client';

export const dynamic = 'force-dynamic';

export default async function VendedoresPage() {
    const { sellers = [] } = await getSellers();
    const { tenants: unassignedTenants = [] } = await getUnassignedTenants();
    const { sellerBreakdown = [], totalCommissions } = await getTotalMonthlyCommissions();

    // Enriquecer cada vendedor con métricas del breakdown
    const sellersWithMetrics = sellers.map((seller: any) => {
        const breakdown = sellerBreakdown.find((b: any) => b.sellerId === seller.id);
        const assignments = seller.seller_assignments ?? [];

        return {
            ...seller,
            activeClients: breakdown?.activeClients ?? 0,
            totalClients: assignments.length,
            monthlyRevenue: breakdown?.activeRevenue ?? 0,
            monthlyCommission: breakdown?.commission ?? 0,
            directCommission: breakdown?.directCommission ?? 0,
            referralCommission: breakdown?.referralCommission ?? 0,
            referralThreshold: breakdown?.referralThreshold ?? 0,
            networkActiveClients: breakdown?.networkActiveClients ?? 0,
            networkRevenue: breakdown?.networkRevenue ?? 0,
            referredSellersCount: breakdown?.referredSellersCount ?? 0,
            commissionPct: breakdown?.commissionPct ?? seller.commission_pct,
            commissionFixed: breakdown?.commissionFixed ?? seller.commission_fixed ?? false,
        };
    });

    const totalActiveClients = sellersWithMetrics.reduce(
        (acc: number, s: any) => acc + s.activeClients, 0
    );

    return (
        <SellersClient
            sellers={sellersWithMetrics}
            unassignedTenants={unassignedTenants}
            totalMonthlyCommissions={totalCommissions ?? 0}
            totalActiveClients={totalActiveClients}
        />
    );
}
