'use server';

import { createClient } from '@/lib/supabase/server';
import { BusinessType } from '@/lib/constants/business-types';

export async function seedTenantData(tenantId: string, type: BusinessType) {
    const supabase = await createClient();

    // Define products per type
    const catalogs: Record<string, any[]> = {
        ferreteria: [
            { name: 'Martillo Galponero', price: 15000, category: 'Herramientas', stock: 10, unit: 'unit' },
            { name: 'Cinta Aisladora PVC', price: 2500, category: 'Electricidad', stock: 50, unit: 'unit' },
            { name: 'Tornillo Fix 40mm (Caja)', price: 4000, category: 'Fijaciones', stock: 20, unit: 'unit' },
            { name: 'Destornillador Phillips', price: 5500, category: 'Herramientas', stock: 15, unit: 'unit' },
        ],
        libreria: [
            { name: 'Cuaderno A4 Rayado', price: 8500, category: 'Escolar', stock: 100, unit: 'unit' },
            { name: 'Lapicera Azul Bic', price: 1200, category: 'Escritura', stock: 200, unit: 'unit' },
            { name: 'Resma A4 500h', price: 6500, category: 'Papel', stock: 30, unit: 'unit' },
            { name: 'Goma de Borrar', price: 500, category: 'Escolar', stock: 50, unit: 'unit' },
        ],
        kiosco: [
            { name: 'Coca Cola 2.25L', price: 3200, category: 'Bebidas', stock: 24, unit: 'unit' },
            { name: 'Alfajor Jorgito', price: 800, category: 'Golosinas', stock: 48, unit: 'unit' },
            { name: 'Yerba Mate 1kg', price: 4500, category: 'Almacén', stock: 10, unit: 'unit' },
        ],
        verduleria: [
            { name: 'Papa Negra (kg)', price: 800, category: 'Verduras', stock: 50, unit: 'kg' },
            { name: 'Banana Ecuador (kg)', price: 1800, category: 'Frutas', stock: 20, unit: 'kg' },
            { name: 'Tomate Perita (kg)', price: 2500, category: 'Verduras', stock: 15, unit: 'kg' },
        ],
        carniceria: [
            { name: 'Asado de Tira (kg)', price: 7500, category: 'Carnes', stock: 20, unit: 'kg' },
            { name: 'Vacío (kg)', price: 8500, category: 'Carnes', stock: 15, unit: 'kg' },
            { name: 'Chorizo Puro Cerdo (kg)', price: 6000, category: 'Embutidos', stock: 10, unit: 'kg' },
        ],
        limpieza: [
            { name: 'Lavandina 1L', price: 1200, category: 'Limpieza', stock: 30, unit: 'unit' },
            { name: 'Detergente 750ml', price: 2500, category: 'Limpieza', stock: 20, unit: 'unit' },
            { name: 'Escoba Plástica', price: 3500, category: 'Limpieza', stock: 10, unit: 'unit' },
        ],
        otro: [] // Empty seeding for custom businesses
    };

    const products = catalogs[type] || [];

    // Insert products
    const items = products.map(p => ({
        tenant_id: tenantId,
        name: p.name,
        price: p.price,
        unit_type: p.unit,
        stock_on_hand: p.stock,
        category: p.category,
        is_active: true
    }));

    const { error } = await supabase.from('products').insert(items);

    if (error) {
        console.error('Error seeding data:', error);
    }
}
