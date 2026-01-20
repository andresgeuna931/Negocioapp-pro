// Business types for registration - shared between client and server

export const BUSINESS_TYPES = [
    { value: 'kiosco', label: 'Kiosco / Almacén' },
    { value: 'libreria', label: 'Librería' },
    { value: 'veterinaria', label: 'Veterinaria' },
    { value: 'verduleria', label: 'Verdulería' },
    { value: 'carniceria', label: 'Carnicería' },
    { value: 'limpieza', label: 'Artículos de Limpieza' },
    { value: 'otro', label: 'Otro' },
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number]['value'];
