import { DollarSign } from 'lucide-react';
import { getCategories } from '@/lib/actions/prices';
import { PriceUpdateForm } from '@/components/products/price-update-form';

export default async function PreciosPage() {
    const categoriesResult = await getCategories();
    const categories = categoriesResult.data || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Actualización de Precios
                </h1>
                <p className="text-slate-500">
                    Actualizá precios masivamente por porcentaje o importando un Excel
                </p>
            </div>

            {/* Main Form */}
            <PriceUpdateForm categories={categories} />
        </div>
    );
}
