// Business types for registration - shared between client and server

export const BUSINESS_TYPES = [
    { value: 'kiosco', label: 'Kiosco / Almacén' },
    { value: 'libreria', label: 'Librería' },
    { value: 'ferreteria', label: 'Ferretería' },
    { value: 'veterinaria', label: 'Veterinaria' },
    { value: 'verduleria', label: 'Verdulería' },
    { value: 'carniceria', label: 'Carnicería' },
    { value: 'limpieza', label: 'Artículos de Limpieza' },
    { value: 'vinoteca', label: 'Vinoteca / Licorería' },
    { value: 'otro', label: 'Otro' },
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number]['value'];

// Categorías pre-cargadas por tipo de negocio.
// Se insertan automáticamente al registrarse un nuevo tenant.
export const CATEGORIES_BY_BUSINESS_TYPE: Record<string, string[]> = {
    kiosco: [
        'Bebidas', 'Golosinas', 'Cigarrillos y Tabaco', 'Lácteos',
        'Panadería', 'Fiambres', 'Almacén', 'Limpieza', 'Perfumería', 'Otros',
    ],
    libreria: [
        'Útiles Escolares', 'Libros', 'Papelería', 'Arte y Manualidades',
        'Tecnología', 'Juguetes', 'Otros',
    ],
    ferreteria: [
        'Herramientas', 'Electricidad', 'Plomería', 'Pinturas',
        'Fijaciones', 'Construcción', 'Otros',
    ],
    veterinaria: [
        'Alimentos', 'Medicamentos', 'Accesorios', 'Higiene', 'Juguetes', 'Otros',
    ],
    verduleria: [
        'Verduras', 'Frutas', 'Hierbas y Especias', 'Hongos', 'Otros',
    ],
    carniceria: [
        'Vacuno', 'Cerdo', 'Pollo', 'Cordero', 'Fiambres', 'Embutidos', 'Otros',
    ],
    limpieza: [
        'Limpieza del Hogar', 'Higiene Personal', 'Desinfectantes',
        'Accesorios de Limpieza', 'Otros',
    ],
    vinoteca: [
        'Vinos Tintos', 'Vinos Blancos', 'Vinos Rosados', 'Espumantes y Champagne',
        'Whiskies y Bourbon', 'Gin y Vodka', 'Ron y Tequila', 'Licores',
        'Cervezas Artesanales', 'Aperitivos', 'Accesorios y Copas', 'Otros',
    ],
    otro: ['General', 'Otros'],
};
