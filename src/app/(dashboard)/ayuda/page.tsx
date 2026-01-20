import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    HelpCircle,
    ShoppingCart,
    Package,
    BarChart3,
    Settings,
    Scan,
    Search,
    Plus,
    AlertTriangle
} from 'lucide-react';

export default function AyudaPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-7 h-7 text-emerald-500" />
                    Manual de Usuario
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Guía rápida para usar NegocioApp Pro
                </p>
            </div>

            {/* Venta Rápida */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShoppingCart className="w-5 h-5 text-emerald-500" />
                        Venta Rápida
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>¿Cómo hacer una venta?</strong></p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li><strong>Escanear código:</strong> Tocá "Escanear Producto" y apuntá la cámara al código de barras</li>
                        <li><strong>Buscar manualmente:</strong> Escribí el nombre del producto en el buscador</li>
                        <li><strong>Ajustar cantidad:</strong> Usá los botones + y - para cambiar la cantidad</li>
                        <li><strong>Cobrar:</strong> Tocá el botón "Cobrar" y seleccioná el método de pago</li>
                    </ol>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg mt-4">
                        <p className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <strong>Nota sobre el escáner:</strong>
                        </p>
                        <p className="text-amber-600 dark:text-amber-300 ml-6">
                            El escáner necesita permisos de cámara. Cuando aparezca el mensaje, tocá "Permitir".
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Productos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-blue-500" />
                        Productos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Gestión de productos:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Ver productos:</strong> Andá a "Productos" en el menú</li>
                        <li><strong>Agregar nuevo:</strong> Tocá el botón "+ Nuevo Producto"</li>
                        <li><strong>Buscar:</strong> Usá la barra de búsqueda por nombre o código</li>
                        <li><strong>Filtrar:</strong> Seleccioná una categoría para filtrar</li>
                        <li><strong>Editar:</strong> Tocá el producto para ver detalles o editarlo</li>
                    </ul>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-4">
                        <p className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-500" />
                            <strong>Tip:</strong> Podés escanear el código de barras al crear un producto
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Stock Bajo */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Stock Bajo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Alertas de stock:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>Esta sección muestra productos que están por debajo del umbral mínimo</li>
                        <li>El umbral por defecto es 5 unidades (configurable)</li>
                        <li>Cada producto puede tener su propio umbral personalizado</li>
                        <li>Revisá esta sección regularmente para reponer mercadería</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Reportes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5 text-purple-500" />
                        Reportes
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Estadísticas disponibles:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Ventas del día:</strong> Total vendido hoy</li>
                        <li><strong>Ventas del mes:</strong> Resumen mensual</li>
                        <li><strong>Top productos:</strong> Los más vendidos del mes</li>
                        <li><strong>Resumen de inventario:</strong> Valor total del stock</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Configuración */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Settings className="w-5 h-5 text-slate-500" />
                        Configuración
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Opciones disponibles:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Datos del negocio:</strong> Nombre, dirección, teléfono</li>
                        <li><strong>Umbral de stock:</strong> Ajustar el mínimo para alertas</li>
                        <li><strong>Estado de suscripción:</strong> Ver plan actual y vencimiento</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Soporte */}
            <Card className="border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300">
                        ¿Necesitás más ayuda? Contactanos:
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                        amgdigital.ok@gmail.com
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
