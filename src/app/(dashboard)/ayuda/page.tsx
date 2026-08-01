'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Search,
    HelpCircle,
    ShoppingCart,
    Package,
    Users,
    BarChart3,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CreditCard,
    MessageCircle,
    LayoutGrid,
    Receipt,
    Wallet,
    Shield
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
    keywords: string[];
}

interface FAQCategory {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    items: FAQItem[];
}

const faqData: FAQCategory[] = [
    {
        id: 'ventas',
        title: 'Ventas',
        icon: <ShoppingCart className="w-5 h-5" />,
        color: 'emerald',
        items: [
            {
                question: '¿Cómo hago una venta?',
                answer: '1. Andá a "Venta Rápida" en el menú\n2. Escaneá el código de barras o buscá el producto por nombre\n3. Ajustá la cantidad con los botones + y -\n4. Tocá "Cobrar" y seleccioná el método de pago (Efectivo, Débito, QR, Transferencia o Cuenta Corriente)',
                keywords: ['vender', 'cobrar', 'carrito', 'agregar']
            },
            {
                question: '¿Cómo aplico un descuento con listas de precios?',
                answer: 'Si el dueño configuró listas de precios (ej: "Mayorista -10%"), aparece un selector arriba a la derecha en Venta Rápida.\n\n1. Seleccioná la lista que corresponde al cliente\n2. Los precios del carrito se actualizan automáticamente\n3. Para volver al precio normal, seleccioná "— Precio de lista —"\n\nEl selector solo aparece cuando hay al menos una lista de precios creada en Configuración.',
                keywords: ['descuento', 'precio', 'mayorista', 'lista', 'selector']
            },
            {
                question: '¿Cómo uso el escáner de códigos de barras?',
                answer: 'Tocá el botón "Escanear Producto" y apuntá la cámara al código de barras. El sistema detecta automáticamente el código y agrega el producto al carrito. Necesitás dar permiso de cámara cuando el navegador lo solicite.',
                keywords: ['escanear', 'camara', 'codigo', 'barras', 'lector']
            },
            {
                question: '¿Puedo usar un lector de códigos USB?',
                answer: 'Sí, los lectores USB funcionan automáticamente. Solo conectalo a la computadora, poné el cursor en el campo de búsqueda y escaneá. El lector "escribe" el código y busca el producto automáticamente.',
                keywords: ['usb', 'lector', 'pistola', 'computadora']
            },
            {
                question: '¿Por qué no puedo agregar más cantidad de un producto?',
                answer: 'El sistema no permite vender más cantidad que el stock disponible. Debajo del campo de cantidad verás "máx: X" indicando cuántas unidades tenés. Si necesitás vender más, primero cargá stock en la sección de Inventario.',
                keywords: ['stock', 'cantidad', 'máximo', 'limite', 'no puedo']
            },
            {
                question: '¿Cómo anulo una venta?',
                answer: 'Solo el dueño puede anular ventas.\n\n1. Andá a Caja\n2. En la sección "Ventas de esta sesión", buscá la venta\n3. Tocá el ícono de anulación (prohibido)\n4. Ingresá el motivo (opcional) y confirmá\n\nLa anulación restaura automáticamente el stock de los productos, revierte la deuda si era una venta fiada, y descuenta el monto de los totales de la sesión. La venta queda registrada como "Anulada" para trazabilidad.',
                keywords: ['anular', 'cancelar', 'venta', 'revertir', 'error']
            },
            {
                question: '¿Cómo registro una venta donde el cliente paga parte ahora y el resto queda fiado?',
                answer: '1. Al cobrar, seleccioná "Cuenta Corriente" por el total de la venta\n2. Andá a Clientes, buscá al cliente y tocá el ícono de billete\n3. Seleccioná el medio de pago (Efectivo, Transferencia o QR) e ingresá el monto que pagó\n4. El cliente queda con solo la diferencia como deuda\n\nEste pago parcial también queda registrado en la caja del día.',
                keywords: ['mixto', 'parcial', 'parte efectivo', 'parte fiado', 'pago mixto']
            }
        ]
    },
    {
        id: 'caja',
        title: 'Control de Caja',
        icon: <Wallet className="w-5 h-5" />,
        color: 'teal',
        items: [
            {
                question: '¿Cómo abro la caja?',
                answer: 'Andá a Caja y tocá "Abrir Caja". Ingresá el monto de efectivo con el que arrancás el día (fondo de caja). A partir de ese momento todas las ventas en efectivo se registran en esa sesión.',
                keywords: ['abrir', 'caja', 'apertura', 'fondo']
            },
            {
                question: '¿Cómo cierro la caja?',
                answer: '1. Andá a Caja y tocá "Cerrar Caja"\n2. Contá el efectivo físico que tenés en el cajón\n3. Ingresá ese monto en "Efectivo real"\n4. El sistema muestra la diferencia entre lo esperado y lo real\n5. Confirmá el cierre\n\nEl historial del cierre queda guardado con todos los detalles.',
                keywords: ['cerrar', 'caja', 'cierre', 'contar', 'efectivo']
            },
            {
                question: '¿Qué son los "Otros medios" en la caja?',
                answer: 'Los "Otros medios" incluyen todas las ventas cobradas por métodos que no son efectivo físico: Débito, QR, Transferencia y Cuenta Corriente. Estos no impactan el cajón físico pero sí se registran en la sesión para control.',
                keywords: ['otros medios', 'debito', 'qr', 'transferencia', 'digital']
            },
            {
                question: '¿Cómo registro un retiro o gasto desde caja?',
                answer: 'Tocá el botón "Retiro/Gasto" en la caja abierta. Ingresá:\n- Monto del retiro\n- Descripción (obligatorio, ej: "Pago proveedor Coca")\n- Método de pago: Efectivo o Transferencia\n\nSi elegís Efectivo: se descuenta del efectivo esperado en el cajón.\nSi elegís Transferencia: queda registrado como gasto pero NO toca el efectivo del cajón (el dinero salió del banco).\n\nEl gasto aparece automáticamente en el módulo de Gastos con el badge "De Caja".',
                keywords: ['retiro', 'gasto', 'egreso', 'proveedor', 'pago', 'transferencia']
            },
            {
                question: '¿Cómo veo las ventas que hice durante la sesión?',
                answer: 'En la página de Caja, con la caja abierta, bajá hasta la sección "Ventas de esta sesión". Ahí ves todas las ventas con:\n- Hora de la venta\n- Productos vendidos\n- Empleado que vendió\n- Método de pago\n- Monto total\n\nTocá el ícono del ojo para ver el detalle completo de cada venta.',
                keywords: ['ventas', 'sesion', 'historial', 'dia', 'detalle']
            },
            {
                question: '¿Cómo veo el historial de cierres anteriores?',
                answer: 'En la página de Caja, con la caja cerrada, bajá hasta "Historial de Cierres". Cada fila muestra: fecha, quién abrió/cerró, apertura, total vendido, efectivo esperado, real y diferencia.\n\nTocá cualquier fila para expandirla y ver:\n- Desglose de ventas por método de pago (efectivo, QR, transferencia, etc.)\n- Lista completa de ventas de esa sesión\n- Ventas anuladas identificadas',
                keywords: ['historial', 'cierres', 'anteriores', 'expandir', 'detalle']
            },
            {
                question: '¿Por qué el efectivo esperado no coincide con el total de ventas?',
                answer: 'El efectivo esperado en caja solo incluye las ventas cobradas en efectivo más el fondo de apertura, menos los retiros. Las ventas por QR, débito, transferencia o fiado NO se suman al efectivo esperado porque ese dinero no entra al cajón físico.',
                keywords: ['efectivo', 'esperado', 'diferencia', 'no coincide', 'total']
            }
        ]
    },
    {
        id: 'productos',
        title: 'Productos',
        icon: <Package className="w-5 h-5" />,
        color: 'blue',
        items: [
            {
                question: '¿Cómo agrego un producto nuevo?',
                answer: 'Andá a Productos > "+ Nuevo Producto". Completá el nombre (obligatorio), el precio y elegí la categoría del desplegable. Podés escanear el código de barras tocando el ícono de cámara al lado del campo. El SKU es opcional.',
                keywords: ['nuevo', 'agregar', 'crear', 'producto']
            },
            {
                question: '¿Qué es el SKU?',
                answer: 'SKU (Stock Keeping Unit) es un código interno que vos inventás para identificar productos. Por ejemplo: "COCA500" para Coca Cola 500ml. Es opcional y útil para productos sin código de barras o para buscar más rápido.',
                keywords: ['sku', 'codigo', 'interno', 'identificar']
            },
            {
                question: '¿Cómo edito o elimino un producto?',
                answer: 'Andá a Productos, hacé click en cualquier producto y se abre un modal para editar todos los datos. Para eliminar, tocá el botón rojo "Eliminar" y confirmá.',
                keywords: ['editar', 'modificar', 'eliminar', 'borrar', 'cambiar']
            },
            {
                question: '¿Cómo actualizo los precios masivamente?',
                answer: 'Andá a Productos > "Actualizar Precios". Podés aplicar un porcentaje de aumento o descuento a todos los productos o solo a una categoría específica.',
                keywords: ['precios', 'masivo', 'porcentaje', 'inflacion', 'actualizar']
            },
            {
                question: '¿Cómo importo productos desde Excel?',
                answer: 'Andá a Productos > "Importar Excel". Descargá la plantilla, completá tus productos, y subí el archivo. Podés importar hasta 500 productos de una vez.\n\nSi un producto ya existe (mismo código de barras o SKU), se actualizará automáticamente. Si no existe, se creará como producto nuevo.',
                keywords: ['excel', 'importar', 'csv', 'masivo', 'planilla']
            },
            {
                question: '¿Cómo filtro productos por categoría?',
                answer: 'En la página de Productos, usá el desplegable "Todas las categorías" que aparece arriba a la derecha del buscador. Seleccioná la categoría que querés ver y la lista se filtra automáticamente.',
                keywords: ['filtrar', 'categoria', 'buscar', 'ordenar']
            }
        ]
    },
    {
        id: 'categorias',
        title: 'Categorías',
        icon: <LayoutGrid className="w-5 h-5" />,
        color: 'teal',
        items: [
            {
                question: '¿Cómo gestiono las categorías de mis productos?',
                answer: 'Andá a Configuración > "Categorías de Productos". Ahí podés ver todas tus categorías, agregar nuevas, renombrar las existentes o eliminarlas. Solo el dueño tiene acceso a esta sección.',
                keywords: ['categoria', 'gestionar', 'agregar', 'editar', 'eliminar']
            },
            {
                question: '¿Qué pasa si renombro una categoría?',
                answer: 'Cuando renombrás una categoría, el nuevo nombre se propaga automáticamente a todos los productos que tenían esa categoría. No perdés ningún producto ni tenés que reasignarlos manualmente.',
                keywords: ['renombrar', 'categoria', 'productos', 'cambiar nombre']
            },
            {
                question: '¿Qué pasa si elimino una categoría que tiene productos?',
                answer: 'Si eliminás una categoría, los productos que tenían esa categoría quedan "sin categoría" pero no se borran. Podés reasignarlos a otra categoría editando cada producto.',
                keywords: ['eliminar', 'categoria', 'productos', 'borrar']
            }
        ]
    },
    {
        id: 'clientes',
        title: 'Clientes y Fiado',
        icon: <Users className="w-5 h-5" />,
        color: 'orange',
        items: [
            {
                question: '¿Cómo creo un cliente?',
                answer: 'Andá a Clientes > "+ Nuevo Cliente". Completá el nombre y opcionalmente teléfono/email. Para habilitar la cuenta corriente (fiado), el dueño debe asignarle un límite de crédito.',
                keywords: ['cliente', 'nuevo', 'crear', 'agregar']
            },
            {
                question: '¿Cómo hago una venta fiada?',
                answer: 'Al momento de cobrar, seleccioná "Cuenta Corriente (Fiado)" como método de pago. Elegí el cliente de la lista y confirmá. La deuda queda registrada automáticamente en la cuenta del cliente.',
                keywords: ['fiado', 'credito', 'cuenta corriente', 'deuda']
            },
            {
                question: '¿Cómo veo cuánto debe un cliente y qué compró?',
                answer: 'Andá a Clientes y tocá el ícono de historial del cliente. Se abre el historial de cuenta que muestra:\n- Todas las ventas fiadas con el detalle de productos comprados\n- Todos los pagos registrados\n- El saldo actual\n\nTocá cualquier fila de "Venta" para expandirla y ver el desglose de productos, cantidades y precios.',
                keywords: ['deuda', 'saldo', 'debe', 'pendiente', 'detalle', 'productos']
            },
            {
                question: '¿Cómo registro un pago de un cliente?',
                answer: 'Andá a Clientes, tocá el cliente que pagó, y usá el botón "Registrar Pago". Seleccioná el medio de pago (Efectivo, Transferencia o QR), ingresá el monto y confirmá. El pago se descuenta de la deuda y se registra en la caja del día.',
                keywords: ['pago', 'abono', 'registrar', 'cobrar']
            },
            {
                question: '¿Qué pasa si el cliente supera su límite de crédito?',
                answer: 'El sistema no permite registrar una venta fiada si supera el límite de crédito del cliente. El dueño puede aumentar el límite desde la ficha del cliente en Clientes > editar.',
                keywords: ['limite', 'credito', 'supera', 'no permite']
            }
        ]
    },
    {
        id: 'stock',
        title: 'Stock e Inventario',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'amber',
        items: [
            {
                question: '¿Cómo cargo stock cuando llega mercadería nueva?',
                answer: 'Seguí estos dos pasos:\n\n1. **Actualizá el stock en Inventario**\nAndá a Inventario, buscá el producto, ingresá la cantidad total que tenés ahora (stock anterior + lo que llegó). Por ejemplo: tenías 30 y llegaron 30 más → ponés 60. El sistema calcula la diferencia de +30 y te pide el motivo.\n\n2. **Registrá el gasto en Gastos**\nAndá a Gastos y registrá el monto total de la compra con categoría "Mercadería". Así el gasto aparece en el Resultado Económico y la ganancia neta es correcta.\n\nEste flujo manual estará reemplazado por el Módulo de Proveedores próximamente.',
                keywords: ['stock', 'cargar', 'entrada', 'reponer', 'inventario', 'mercadería', 'compra']
            },
            {
                question: '¿Cómo funciona la alerta de stock bajo?',
                answer: 'Cuando un producto baja de cierta cantidad (por defecto 5 unidades), aparece en la sección "Stock Bajo". Podés personalizar este umbral por producto o globalmente en Configuración.',
                keywords: ['alerta', 'bajo', 'minimo', 'umbral', 'aviso']
            },
            {
                question: '¿Cómo hago un ajuste de inventario?',
                answer: 'Si el stock real no coincide con el sistema, usá el módulo Inventario:\n\n1. Andá a Inventario\n2. Buscá el producto\n3. Ingresá la cantidad real contada\n4. El sistema calcula la diferencia y te pide el motivo\n5. Aplicá el ajuste\n\nEl ajuste queda registrado con fecha, usuario y motivo. No se puede modificar el stock directamente desde el formulario del producto.',
                keywords: ['ajuste', 'diferencia', 'corregir', 'inventario']
            }
        ]
    },
    {
        id: 'gastos',
        title: 'Gastos',
        icon: <Receipt className="w-5 h-5" />,
        color: 'red',
        items: [
            {
                question: '¿Qué es el módulo de Gastos?',
                answer: 'El módulo de Gastos es visible solo para el dueño. Permite registrar todos los gastos del negocio (alquiler, luz, mercadería, sueldos, etc.) y ver la ganancia real del mes.',
                keywords: ['gastos', 'modulo', 'ganancia', 'ingresos']
            },
            {
                question: '¿Cómo registro un gasto?',
                answer: 'Andá a Gastos y tocá "+ Nuevo gasto". Ingresá el monto, la fecha, la categoría y una descripción opcional. El gasto queda registrado inmediatamente.',
                keywords: ['registrar', 'gasto', 'nuevo', 'cargar']
            },
            {
                question: '¿Cómo aparecen los egresos de caja en Gastos?',
                answer: 'Cuando se registra un "Retiro/Gasto" en Caja, ese egreso aparece automáticamente en el módulo de Gastos con el badge "De Caja". No hace falta cargarlo dos veces.\n\nLos egresos de caja no se pueden eliminar desde Gastos — si necesitás corregir uno, hacelo desde Caja con un ingreso compensatorio.',
                keywords: ['caja', 'egreso', 'retiro', 'automatico', 'badge']
            },
            {
                question: '¿Los empleados pueden ver los gastos?',
                answer: 'No. El módulo de Gastos es visible únicamente para el dueño. Los empleados solo pueden ver ventas y el control de caja.',
                keywords: ['empleado', 'ver', 'gastos', 'permiso']
            },
            {
                question: '¿Puedo filtrar los gastos por período?',
                answer: 'Sí. En la página de Gastos podés filtrar por: Hoy, Esta semana, Este mes o Este año. El resumen y la lista se actualizan automáticamente.',
                keywords: ['filtrar', 'periodo', 'mes', 'año', 'semana']
            }
        ]
    },
    {
        id: 'reportes',
        title: 'Reportes',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'purple',
        items: [
            {
                question: '¿Cómo veo las ventas por período?',
                answer: 'Andá a Reportes. Podés elegir entre:\n- Últimos 30 días\n- Este mes\n- Mes anterior\n- Rango personalizado (elegís fecha desde y hasta)\n\nTambién podés navegar mes a mes con las flechas.',
                keywords: ['ventas', 'periodo', 'mes', 'rango', 'filtro']
            },
            {
                question: '¿Qué muestra el Resultado económico?',
                answer: 'El Resultado económico es el P&L (Pérdidas y Ganancias) del período:\n\n- Ventas totales\n- Costo mercadería vendida (basado en el costo cargado en cada producto)\n- Ganancia bruta\n- Gastos del período (incluye gastos del módulo de Gastos Y egresos de caja)\n- Ganancia neta con porcentaje de margen\n\nNota: el costo histórico se registra desde la fecha de activación. Ventas anteriores muestran costo $0.',
                keywords: ['resultado', 'economico', 'ganancia', 'perdida', 'margen', 'costo']
            },
            {
                question: '¿Qué muestra Ventas por medio de pago?',
                answer: 'Muestra el total vendido desglosado por cada método de pago del período: Efectivo, Transferencia, QR, Débito, Crédito y Cuenta corriente. Cada uno muestra el monto y el porcentaje sobre el total.',
                keywords: ['medio', 'pago', 'efectivo', 'qr', 'debito', 'desglose']
            },
            {
                question: '¿Cómo uso el gráfico de ventas?',
                answer: 'El gráfico muestra la evolución de ventas día a día. Pasá el cursor sobre cualquier barra para ver:\n- Fecha\n- Monto vendido ese día\n- Cantidad de ventas\n- Ticket promedio del día',
                keywords: ['grafico', 'barras', 'tooltip', 'dia', 'evolucion']
            },
            {
                question: '¿Cómo exporto reportes a Excel?',
                answer: 'En la sección Reportes, usá el botón "Exportar Excel". El archivo incluye el resumen del período y el Top 10 de productos. Disponible en los planes Profesional y Business.',
                keywords: ['excel', 'exportar', 'descargar', 'reporte']
            },
            {
                question: '¿Cómo veo qué productos se venden más?',
                answer: 'En Reportes hay una sección "Top 10 Productos" con los más vendidos por ingresos en el período seleccionado. También podés ver la cantidad vendida de cada uno.',
                keywords: ['top', 'mas vendido', 'popular', 'ranking']
            }
        ]
    },
    {
        id: 'roles',
        title: 'Roles y Permisos',
        icon: <Shield className="w-5 h-5" />,
        color: 'indigo',
        items: [
            {
                question: '¿Cuáles son los roles disponibles?',
                answer: 'Hay dos roles principales:\n\n- Dueño: acceso total a todas las funciones del negocio\n- Empleado: puede vender, manejar caja y registrar egresos, pero NO puede ver Gastos, Reportes, Configuración ni crear o eliminar productos',
                keywords: ['roles', 'permisos', 'dueño', 'empleado']
            },
            {
                question: '¿Qué puede hacer un empleado?',
                answer: 'El empleado puede:\n✓ Hacer ventas (incluyendo fiado)\n✓ Abrir y cerrar caja\n✓ Registrar retiros/gastos desde caja\n✓ Ver sus propios cierres de caja anteriores\n✓ Ver y gestionar clientes\n\nEl empleado NO puede:\n✗ Ver el módulo de Gastos\n✗ Ver Reportes completos\n✗ Acceder a Configuración\n✗ Crear, editar o eliminar productos\n✗ Anular ventas',
                keywords: ['empleado', 'puede', 'no puede', 'restriccion', 'acceso']
            },
            {
                question: '¿Cómo invito a un empleado?',
                answer: 'Andá a Configuración > Gestión de Equipo. Ingresá el email del empleado y enviá la invitación. El empleado recibirá un correo para registrarse con su contraseña.',
                keywords: ['empleado', 'invitar', 'equipo', 'usuario', 'email']
            },
            {
                question: '¿Quién puede anular ventas?',
                answer: 'Solo el dueño puede anular ventas. Los empleados pueden ver las ventas de la sesión pero no tienen el botón de anulación.',
                keywords: ['anular', 'venta', 'permiso', 'empleado', 'dueño']
            }
        ]
    },
    {
        id: 'cuenta',
        title: 'Mi Cuenta y Suscripción',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'indigo',
        items: [
            {
                question: '¿Cuándo se cobra la suscripción?',
                answer: 'Los cobros se realizan automáticamente a través de MercadoPago el mismo día del mes en que te suscribiste, renovándose cada mes (o cada año si elegiste el plan anual).',
                keywords: ['cobro', 'fecha', 'cuando', 'suscripcion']
            },
            {
                question: '¿Qué métodos de pago aceptan?',
                answer: 'Aceptamos tarjetas de crédito y débito a través de MercadoPago. El cobro es automático cada mes.',
                keywords: ['pago', 'tarjeta', 'credito', 'debito', 'mercadopago']
            },
            {
                question: '¿Qué pasa si el pago falla?',
                answer: 'Si el pago no se puede procesar, MercadoPago reintenta automáticamente. Si finalmente no se puede cobrar, la cuenta se suspende hasta que regularices el pago. Tus datos se mantienen seguros.',
                keywords: ['pago', 'falla', 'error', 'suspende', 'vence']
            },
            {
                question: '¿Cómo configuro los datos de mi negocio?',
                answer: 'Andá a Configuración. Ahí podés cambiar el nombre del negocio, dirección, teléfono y otros datos. También podés gestionar las categorías de productos y ver el estado de tu suscripción.',
                keywords: ['configurar', 'negocio', 'datos', 'nombre']
            }
        ]
    }
];

export default function AyudaPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['ventas']);
    const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) {
            return faqData;
        }
        const query = searchQuery.toLowerCase();
        return faqData.map(category => ({
            ...category,
            items: category.items.filter(item =>
                item.question.toLowerCase().includes(query) ||
                item.answer.toLowerCase().includes(query) ||
                item.keywords.some(k => k.includes(query))
            )
        })).filter(category => category.items.length > 0);
    }, [searchQuery]);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const toggleQuestion = (questionId: string) => {
        setExpandedQuestions(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const totalResults = filteredData.reduce((acc, cat) => acc + cat.items.length, 0);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-7 h-7 text-emerald-500" />
                    Centro de Ayuda
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Encontrá respuestas a las preguntas más frecuentes
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                    type="text"
                    placeholder="Buscar: ¿Cómo anulo una venta? ¿Cómo cierro la caja?..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                />
                {searchQuery && (
                    <p className="text-sm text-slate-500 mt-2">
                        {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <div className="space-y-4">
                {filteredData.map((category) => (
                    <Card key={category.id} className="overflow-hidden">
                        <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full p-4 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-600`}>
                                    {category.icon}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                        {category.title}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {category.items.length} pregunta{category.items.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            {expandedCategories.includes(category.id) ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        {expandedCategories.includes(category.id) && (
                            <CardContent className="pt-0 pb-4">
                                <div className="space-y-2">
                                    {category.items.map((item, idx) => {
                                        const questionId = `${category.id}-${idx}`;
                                        const isExpanded = expandedQuestions.includes(questionId);
                                        return (
                                            <div
                                                key={questionId}
                                                className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => toggleQuestion(questionId)}
                                                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-slate-200 pr-4">
                                                        {item.question}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    )}
                                                </button>
                                                {isExpanded && (
                                                    <div className="px-3 pb-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line bg-slate-50 dark:bg-slate-800/30">
                                                        {item.answer}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {searchQuery && totalResults === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                            No encontramos resultados
                        </h3>
                        <p className="text-slate-500 text-sm">
                            Probá con otras palabras o contactanos directamente
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                            <MessageCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                ¿No encontrás lo que buscás?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                Nuestro equipo está para ayudarte. Escribinos y te respondemos a la brevedad.
                            </p>
                            <a href="mailto:amgdigital.ok@gmail.com" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                                amgdigital.ok@gmail.com
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
