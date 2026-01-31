import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    HelpCircle,
    ShoppingCart,
    Package,
    BarChart3,
    Settings,
    Plus,
    AlertTriangle,
    ScanLine,
    Edit,
    Trash2,
    Users,
    FileText,
    Usb
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
                    Guía completa para usar NegocioApp Pro
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
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>¿Cómo hacer una venta?</strong></p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li><strong>Escanear código:</strong> Tocá "Escanear Producto" y apuntá la cámara al código de barras</li>
                        <li><strong>Buscar manualmente:</strong> Escribí el nombre del producto en el buscador</li>
                        <li><strong>Ajustar cantidad:</strong> Usá los botones + y - para cambiar la cantidad</li>
                        <li><strong>Cobrar:</strong> Tocá "Cobrar" y seleccioná el método de pago (Efectivo, Transferencia, o Cuenta Corriente)</li>
                    </ol>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                        <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-2">Control de Stock:</p>
                        <ul className="text-emerald-600 dark:text-emerald-300 space-y-1 ml-2">
                            <li>• El sistema no permite vender más cantidad que el stock disponible</li>
                            <li>• Debajo de la cantidad verás "máx: X" indicando el stock disponible</li>
                            <li>• El botón + se desactiva cuando llegás al máximo</li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
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
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Gestión de productos:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Ver productos:</strong> Andá a "Productos" en el menú lateral</li>
                        <li><strong>Agregar nuevo:</strong> Tocá el botón "+ Nuevo Producto"</li>
                        <li><strong>Buscar:</strong> Usá la barra de búsqueda por nombre o código</li>
                        <li><strong>Filtrar:</strong> Seleccioná una categoría para ver solo esos productos</li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-400 mb-2">
                            <Edit className="w-4 h-4" />
                            Editar o eliminar productos:
                        </p>
                        <p className="text-blue-600 dark:text-blue-300 ml-6">
                            Hacé click en cualquier producto para abrir el editor. Podés modificar todos los datos o eliminarlo con el botón rojo.
                        </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-400 mb-2">
                            <ScanLine className="w-4 h-4" />
                            Escanear código al crear producto:
                        </p>
                        <p className="text-blue-600 dark:text-blue-300 ml-6">
                            Al crear un producto nuevo, tocá el ícono de escáner 📷 al lado del campo "Código de barras" para escanear automáticamente.
                        </p>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 p-3 rounded-lg">
                        <p className="font-medium mb-2">Campos del producto:</p>
                        <ul className="space-y-1">
                            <li><strong>Nombre *:</strong> Nombre del producto (obligatorio)</li>
                            <li><strong>Código de barras:</strong> El número que viene impreso en el producto</li>
                            <li><strong>SKU (opcional):</strong> Código interno que vos inventás para identificar productos. Ejemplo: "COCA500" para Coca Cola 500ml. Útil para productos sin código de barras.</li>
                            <li><strong>Precio *:</strong> Precio de venta (obligatorio)</li>
                            <li><strong>Costo:</strong> Lo que te costó a vos (para calcular ganancia)</li>
                            <li><strong>Stock:</strong> Cantidad disponible actualmente</li>
                            <li><strong>Alerta stock bajo:</strong> Te avisamos cuando quede menos de esta cantidad</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Lector USB */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Usb className="w-5 h-5 text-indigo-500" />
                        Lector de Códigos USB
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>¿Tenés computadora pero no escáner?</strong></p>
                    <p>Podés comprar un lector de códigos USB económico ($10-20 USD). Funcionan así:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Conectá el lector USB a la computadora</li>
                        <li>Poné el cursor en el campo de búsqueda de productos</li>
                        <li>Escaneá el código de barras - el lector "escribe" el número automáticamente</li>
                        <li>El producto aparece en el carrito</li>
                    </ol>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                        <p className="text-indigo-600 dark:text-indigo-300">
                            <strong>No requiere configuración:</strong> Los lectores USB funcionan como un teclado, conectás y listo.
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
                        <li>El umbral por defecto es 5 unidades (podés cambiarlo en Configuración)</li>
                        <li>Cada producto puede tener su propio umbral personalizado</li>
                        <li>Revisá esta sección regularmente para reponer mercadería a tiempo</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Clientes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-orange-500" />
                        Clientes y Cuentas Corrientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>Gestión de fiados:</strong></p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Crear cliente:</strong> Andá a "Clientes" y tocá "+ Nuevo Cliente"</li>
                        <li><strong>Venta fiada:</strong> Al cobrar, elegí "Cuenta Corriente (Fiado)" y seleccioná el cliente</li>
                        <li><strong>Ver deuda:</strong> En la lista de clientes podés ver el saldo de cada uno</li>
                        <li><strong>Registrar pago:</strong> Tocá el cliente para registrar un pago a cuenta</li>
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
                        <li><strong>Ventas del mes:</strong> Resumen mensual con gráfico</li>
                        <li><strong>Top productos:</strong> Los más vendidos del mes</li>
                        <li><strong>Resumen de inventario:</strong> Valor total del stock</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Importar Productos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 text-teal-500" />
                        Importar Productos desde Excel
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>¿Tenés muchos productos para cargar?</strong></p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Andá a "Productos" y tocá "Importar Excel"</li>
                        <li>Descargá la plantilla de ejemplo</li>
                        <li>Completá el Excel con tus productos (nombre, precio, código, etc.)</li>
                        <li>Subí el archivo y confirmá la importación</li>
                    </ol>
                    <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg">
                        <p className="text-teal-600 dark:text-teal-300">
                            <strong>Tip:</strong> Podés importar hasta 500 productos de una vez.
                        </p>
                    </div>
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
                        <li><strong>Equipo:</strong> Agregar empleados con acceso limitado</li>
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
