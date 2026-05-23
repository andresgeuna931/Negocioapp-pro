'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { BusinessType } from '@/lib/constants/business-types';

const categoryMap: Record<string, string[]> = {
    kiosco: ['Golosinas', 'Chocolates y alfajores', 'Chicles y caramelos', 'Snacks y frituras', 'Bebidas con alcohol', 'Bebidas sin alcohol', 'Aguas y jugos', 'Infusiones', 'Cigarrillos y tabaco', 'Lácteos y fiambres', 'Panificados', 'Enlatados y conservas', 'Condimentos', 'Higiene personal', 'Artículos de limpieza', 'Pilas y accesorios', 'Varios'],
    libreria: ['Útiles escolares', 'Cuadernos y carpetas', 'Lapiceras y bolígrafos', 'Lápices y colores', 'Pinturas y marcadores', 'Papel y cartulina', 'Arte y manualidades', 'Mochilas y cartucheras', 'Libros', 'Juguetes didácticos', 'Tecnología escolar', 'Sellados y formularios', 'Varios'],
    ferreteria: ['Herramientas manuales', 'Herramientas eléctricas', 'Tornillería y bulonería', 'Pinturas y barnices', 'Plomería y sanitarios', 'Electricidad e iluminación', 'Materiales de construcción', 'Adhesivos y selladores', 'Cerrajería', 'Seguridad', 'Jardín y exterior', 'Varios'],
    veterinaria: ['Alimentos perros', 'Alimentos gatos', 'Alimentos otras mascotas', 'Antiparasitarios externos', 'Antiparasitarios internos', 'Medicamentos', 'Vacunas', 'Accesorios perros', 'Accesorios gatos', 'Juguetes', 'Higiene y grooming', 'Jaulas y transportes', 'Servicios', 'Varios'],
    verduleria: ['Verduras de hoja', 'Tubérculos y raíces', 'Frutas tropicales', 'Frutas de estación', 'Cítricos', 'Hierbas aromáticas', 'Legumbres secas', 'Huevos', 'Productos orgánicos', 'Varios'],
    carniceria: ['Vacuno', 'Cerdo', 'Pollo', 'Cordero y chivito', 'Embutidos', 'Achuras y menudencias', 'Fiambres', 'Marinados y preparados', 'Varios'],
    limpieza: ['Limpieza del hogar', 'Limpieza de ropa', 'Desinfectantes', 'Higiene personal', 'Papelería descartable', 'Accesorios de limpieza', 'Fragancias y ambientadores', 'Varios'],
    dietetica: ['Cereales y granos', 'Legumbres', 'Frutos secos y semillas', 'Harinas alternativas', 'Endulzantes naturales', 'Aceites y aderezos', 'Infusiones y tés', 'Suplementos y vitaminas', 'Proteínas y deportivos', 'Snacks saludables', 'Productos veganos', 'Cosmética natural', 'Varios'],
    jardineria: ['Plantas de interior', 'Plantas de exterior', 'Plantas aromáticas', 'Cactus y suculentas', 'Árboles y arbustos', 'Semillas', 'Tierra y sustratos', 'Macetas y contenedores', 'Fertilizantes', 'Pesticidas y herbicidas', 'Herramientas de jardín', 'Riego', 'Varios'],
    imprenta: ['Fotocopias', 'Impresiones', 'Anillados y encuadernados', 'Laminados', 'Ploteos y planos', 'Diseño gráfico', 'Sellados', 'Papelería', 'Insumos de impresión', 'Servicios digitales', 'Varios'],
    otro: ['Productos', 'Servicios', 'Varios'],
};

export async function seedTenantData(tenantId: string, type: BusinessType) {
    // Use admin client to bypass RLS during seeding
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Seed categories
    const categories = categoryMap[type] || categoryMap['otro'];
    const categoryRows = categories.map(name => ({ tenant_id: tenantId, name }));
    const { error: catError } = await supabase.from('categories').insert(categoryRows);
    if (catError) {
        console.error('Error seeding categories:', catError);
    }

    // 2. Seed sample products
    const catalogs: Record<string, any[]> = {
        ferreteria: [
            { name: 'Martillo Galponero', price: 15000, category: 'Herramientas manuales', stock: 10, unit: 'unit' },
            { name: 'Cinta Aisladora PVC', price: 2500, category: 'Electricidad e iluminación', stock: 50, unit: 'unit' },
            { name: 'Tornillo Fix 40mm (Caja)', price: 4000, category: 'Tornillería y bulonería', stock: 20, unit: 'unit' },
            { name: 'Destornillador Phillips', price: 5500, category: 'Herramientas manuales', stock: 15, unit: 'unit' },
        ],
        libreria: [
            { name: 'Cuaderno A4 Rayado', price: 8500, category: 'Cuadernos y carpetas', stock: 100, unit: 'unit' },
            { name: 'Lapicera Azul Bic', price: 1200, category: 'Lapiceras y bolígrafos', stock: 200, unit: 'unit' },
            { name: 'Resma A4 500h', price: 6500, category: 'Papel y cartulina', stock: 30, unit: 'unit' },
            { name: 'Goma de Borrar', price: 500, category: 'Útiles escolares', stock: 50, unit: 'unit' },
        ],
        kiosco: [
            { name: 'Coca Cola 2.25L', price: 3200, category: 'Bebidas sin alcohol', stock: 24, unit: 'unit' },
            { name: 'Alfajor Jorgito', price: 800, category: 'Chocolates y alfajores', stock: 48, unit: 'unit' },
            { name: 'Yerba Mate 1kg', price: 4500, category: 'Infusiones', stock: 10, unit: 'unit' },
        ],
        verduleria: [
            { name: 'Papa Negra (kg)', price: 800, category: 'Tubérculos y raíces', stock: 50, unit: 'kg' },
            { name: 'Banana Ecuador (kg)', price: 1800, category: 'Frutas tropicales', stock: 20, unit: 'kg' },
            { name: 'Tomate Perita (kg)', price: 2500, category: 'Verduras de hoja', stock: 15, unit: 'kg' },
        ],
        carniceria: [
            { name: 'Asado de Tira (kg)', price: 7500, category: 'Vacuno', stock: 20, unit: 'kg' },
            { name: 'Vacío (kg)', price: 8500, category: 'Vacuno', stock: 15, unit: 'kg' },
            { name: 'Chorizo Puro Cerdo (kg)', price: 6000, category: 'Embutidos', stock: 10, unit: 'kg' },
        ],
        limpieza: [
            { name: 'Lavandina 1L', price: 1200, category: 'Limpieza del hogar', stock: 30, unit: 'unit' },
            { name: 'Detergente 750ml', price: 2500, category: 'Limpieza del hogar', stock: 20, unit: 'unit' },
            { name: 'Escoba Plástica', price: 3500, category: 'Accesorios de limpieza', stock: 10, unit: 'unit' },
        ],
        veterinaria: [
            { name: 'Alimento Perro Adulto 15kg', price: 28000, category: 'Alimentos perros', stock: 10, unit: 'unit' },
            { name: 'Alimento Gato Adulto 7.5kg', price: 18000, category: 'Alimentos gatos', stock: 10, unit: 'unit' },
            { name: 'Antipulgas Pipeta Perro', price: 4500, category: 'Antiparasitarios externos', stock: 20, unit: 'unit' },
        ],
        dietetica: [
            { name: 'Avena Arrollada 500g', price: 2500, category: 'Cereales y granos', stock: 30, unit: 'unit' },
            { name: 'Chía 250g', price: 3500, category: 'Frutos secos y semillas', stock: 20, unit: 'unit' },
            { name: 'Stevia 100g', price: 4000, category: 'Endulzantes naturales', stock: 15, unit: 'unit' },
        ],
        jardineria: [
            { name: 'Sustrato Universal 20L', price: 5500, category: 'Tierra y sustratos', stock: 20, unit: 'unit' },
            { name: 'Fertilizante Líquido 500ml', price: 3500, category: 'Fertilizantes', stock: 15, unit: 'unit' },
            { name: 'Maceta Plástica N14', price: 1200, category: 'Macetas y contenedores', stock: 30, unit: 'unit' },
        ],
        imprenta: [
            { name: 'Fotocopia A4 B/N', price: 50, category: 'Fotocopias', stock: 9999, unit: 'unit' },
            { name: 'Impresión Color A4', price: 200, category: 'Impresiones', stock: 9999, unit: 'unit' },
            { name: 'Anillado A4', price: 1500, category: 'Anillados y encuadernados', stock: 9999, unit: 'unit' },
        ],
        otro: [],
    };

    const products = catalogs[type] || [];
    const items = products.map(p => ({
        tenant_id: tenantId,
        name: p.name,
        price: p.price,
        unit_type: p.unit,
        stock_on_hand: p.stock,
        category: p.category,
        is_active: true
    }));

    if (items.length > 0) {
        const { error: prodError } = await supabase.from('products').insert(items);
        if (prodError) {
            console.error('Error seeding products:', prodError);
        }
    }
}
