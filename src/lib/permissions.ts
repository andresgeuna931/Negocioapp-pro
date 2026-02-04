// ============================================
// PERMISSIONS HELPER - NEGOCIOAPP PRO
// ============================================

import { UserRole } from '@/lib/types';

// Definición de permisos por acción
export type Permission =
    | 'products:view'
    | 'products:create'
    | 'products:edit'
    | 'products:delete'
    | 'sales:create'
    | 'sales:view'
    | 'customers:view'
    | 'customers:create'
    | 'customers:edit'
    | 'customers:credit'      // Dar fiado
    | 'customers:collect'     // Cobrar deudas
    | 'reports:view_today'
    | 'reports:view_all'
    | 'cash:open_close'
    | 'cash:withdraw'
    | 'config:view'
    | 'config:edit'
    | 'team:view'
    | 'team:manage'
    | 'subscription:view'
    | 'subscription:manage';

// Matriz de permisos por rol
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    owner: [
        // Productos
        'products:view',
        'products:create',
        'products:edit',
        'products:delete',
        // Ventas
        'sales:create',
        'sales:view',
        // Clientes
        'customers:view',
        'customers:create',
        'customers:edit',
        'customers:credit',
        'customers:collect',
        // Reportes
        'reports:view_today',
        'reports:view_all',
        // Caja
        'cash:open_close',
        'cash:withdraw',
        // Configuración
        'config:view',
        'config:edit',
        // Equipo
        'team:view',
        'team:manage',
        // Suscripción
        'subscription:view',
        'subscription:manage',
    ],
    staff: [
        // Productos (solo ver)
        'products:view',
        // Ventas
        'sales:create',
        'sales:view',
        // Clientes
        'customers:view',
        'customers:create',
        'customers:credit',   // Puede dar fiado
        'customers:collect',  // Puede cobrar
        // Reportes (solo del día)
        'reports:view_today',
        // Caja
        'cash:open_close',
    ],
    admin: [
        // Admin tiene todos los permisos (superusuario)
        'products:view',
        'products:create',
        'products:edit',
        'products:delete',
        'sales:create',
        'sales:view',
        'customers:view',
        'customers:create',
        'customers:edit',
        'customers:credit',
        'customers:collect',
        'reports:view_today',
        'reports:view_all',
        'cash:open_close',
        'cash:withdraw',
        'config:view',
        'config:edit',
        'team:view',
        'team:manage',
        'subscription:view',
        'subscription:manage',
    ],
};

// Verificar si un rol tiene un permiso específico
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Verificar múltiples permisos (todos deben cumplirse)
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p));
}

// Verificar si tiene al menos uno de los permisos
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p));
}

// Rutas restringidas por rol
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
    '/productos/nuevo': ['products:create'],
    '/productos/editar': ['products:edit'],
    '/config': ['config:view'],
    '/config/precios': ['config:edit'],
    '/precios': ['subscription:view'],
    '/reportes': ['reports:view_today'],
};

// Verificar si un rol puede acceder a una ruta
export function canAccessRoute(role: UserRole, pathname: string): boolean {
    // Buscar la ruta más específica que coincida
    for (const [route, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route)) {
            return hasAnyPermission(role, permissions);
        }
    }
    // Por defecto, permitir acceso
    return true;
}

// Obtener el nombre en español del rol
export function getRoleName(role: UserRole): string {
    const names: Record<UserRole, string> = {
        owner: 'Dueño',
        staff: 'Empleado',
        admin: 'Administrador',
    };
    return names[role] || role;
}

// Obtener todos los permisos de un rol
export function getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}
