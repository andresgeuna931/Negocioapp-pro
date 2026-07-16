import { ClipboardList } from 'lucide-react';
import { getAdjustmentHistory } from '@/lib/actions/inventory';
import { InventoryCountForm } from '@/components/inventory/inventory-count-form';
import { AdjustmentHistoryTable } from '@/components/inventory/adjustment-history-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentSession } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export default async function InventarioPage() {
    // SEC-09: solo owner y admin pueden acceder al inventario
    const session = await getCurrentSession();
    if (session?.profile.role === 'staff') {
        redirect('/');
    }

    const historyResult = await getAdjustmentHistory(10);
    const history = historyResult.data || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Inventario Físico
                </h1>
                <p className="text-slate-500">
                    Conteo de productos y ajuste de diferencias
                </p>
            </div>

            {/* Inventory Count Form */}
            <InventoryCountForm />

            {/* Adjustment History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Historial de Ajustes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <AdjustmentHistoryTable adjustments={history} />
                </CardContent>
            </Card>
        </div>
    );
}
