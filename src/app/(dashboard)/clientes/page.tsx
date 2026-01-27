import { Suspense } from 'react';
import { getCustomers } from '@/lib/actions/customers';
import { CustomersTable } from '@/components/customers/customers-table';
import { Users } from 'lucide-react';
import { CustomersImportModal } from '@/components/customers/CustomersImportModal';

export default async function CustomersPage() {
    const { data: customers, success } = await getCustomers();

    if (!success) {
        return (
            <div className="p-8 text-center text-red-500">
                Error al cargar clientes. Intenta recargar la página.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-emerald-600" />
                        Clientes y Cuentas Corrientes
                    </h1>
                    <p className="text-slate-500">
                        Gestioná tus clientes habituales, límites de crédito (fiado) y saldos pendientes.
                    </p>
                </div>
                <div>
                    <CustomersImportModal />
                </div>
            </div>

            <Suspense fallback={<div className="text-center p-10">Cargando clientes...</div>}>
                <CustomersTable initialCustomers={customers || []} />
            </Suspense>
        </div>
    );
}
