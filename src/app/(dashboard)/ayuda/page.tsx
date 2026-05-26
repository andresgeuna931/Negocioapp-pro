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
    LayoutGrid
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
                answer: '1. Andá a "Venta Rápida" en el menú\n2. Escaneá el código de barras o buscá el producto por nombre\n3. Ajustá la cantidad con los botones + y -\n4. Tocá "Cobrar" y seleccioná el método de pago (Efectivo, Transferencia o Fiado)',
                keywords: ['vender', 'cobrar', 'carrito', 'agregar']
            },
            {
                question: '¿Por qué no puedo agregar más cantidad de un producto?',
                answer: 'El sistema no permite vender más cantidad que el stock disponible. Debajo del campo de cantidad verás "máx: X" indicando cuántas unidades tenés. Si necesitás vender más, primero cargá stock en la sección de Inventario.',
                keywords: ['stock', 'cantidad', 'máximo', 'limite', 'no puedo']
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
                question: '¿Cómo aplico un descuento?',
                answer: 'Podés crear listas de precios con descuentos en la sección Configuración > Listas de Precios. Al vender, seleccioná la lista correspondiente (ej: "Mayorista -10%") y los precios se ajustan automáticamente.',
                keywords: ['descuento', 'precio', 'mayorista', 'lista']
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
                answer: 'Andá a Productos > "Importar Excel". Descargá la plantilla, completá tus productos, y subí el archivo. Podés importar hasta 500 productos de una vez.',
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
                answer: 'Andá a Configuración > "Categorías de Productos". Ahí podés ver todas tus categorías, agregar nuevas, renombrar las existentes o eliminarlas. Solo el dueño del negocio tiene acceso a esta sección.',
                keywords: ['categoria', 'gestionar', 'agregar', 'editar', 'eliminar']
            },
            {
                question: '¿Puedo agregar categorías personalizadas?',
                answer: 'Sí. En Configuración > Categorías de Productos, escribí el nombre de la nueva categoría en el campo de texto y tocá "Agregar". La categoría queda disponible inmediatamente para asignar a productos.',
                keywords: ['categoria', 'nueva', 'personalizada', 'agregar']
            },
            {
                question: '¿Qué pasa si elimino una categoría que tiene productos?',
                answer: 'Si eliminás una categoría, los productos que tenían esa categoría quedan "sin categoría" pero no se borran. Podés reasignarlos a otra categoría editando cada producto.',
                keywords: ['eliminar', 'categoria', 'productos', 'borrar']
            },
            {
                question: '¿Por qué ya tengo categorías cuando recién me registré?',
                answer: 'Al registrarte, el sistema detecta el tipo de negocio que elegiste (kiosco, ferretería, verdulería, etc.) y carga automáticamente una lista de categorías sugeridas para ese tipo de negocio. Podés editarlas o agregar las tuyas.',
                keywords: ['categorias', 'automatico', 'registro', 'tipo', 'negocio']
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
                answer: 'Andá a Clientes > "+ Nuevo Cliente". Completá el nombre y opcionalmente teléfono/email. Esto permite llevar cuenta corriente (fiado) con ese cliente.',
                keywords: ['cliente', 'nuevo', 'crear', 'agregar']
            },
            {
                question: '¿Cómo hago una venta fiada?',
                answer: 'Al momento de cobrar, seleccioná "Cuenta Corriente (Fiado)" como método de pago. Elegí el cliente de la lista y confirmá. La deuda queda registrada automáticamente.',
                keywords: ['fiado', 'credito', 'cuenta corriente', 'deuda']
            },
            {
                question: '¿Cómo veo cuánto debe un cliente?',
                answer: 'Andá a Clientes. Ahí verás la lista con el saldo pendiente de cada uno. Tocá un cliente para ver el detalle de sus compras fiadas.',
                keywords: ['deuda', 'saldo', 'debe', 'pendiente']
            },
            {
                question: '¿Cómo registro un pago de un cliente?',
                answer: 'Andá a Clientes, tocá el cliente que pagó, y usá el botón "Registrar Pago". Ingresá el monto y se descuenta de su deuda.',
                keywords: ['pago', 'abono', 'registrar', 'cobrar']
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
                question: '¿Cómo cargo stock de un producto?',
                answer: 'Andá a Inventario > "+ Nueva Entrada". Buscá el producto, ingresá la cantidad recibida y opcionalmente el costo. El stock se suma automáticamente.',
                keywords: ['stock', 'cargar', 'entrada', 'reponer', 'inventario']
            },
            {
                question: '¿Cómo funciona la alerta de stock bajo?',
                answer: 'Cuando un producto baja de cierta cantidad (por defecto 5 unidades), aparece en la sección "Stock Bajo". Podés personalizar este umbral por producto o globalmente en Configuración.',
                keywords: ['alerta', 'bajo', 'minimo', 'umbral', 'aviso']
            },
            {
                question: '¿Cómo hago un ajuste de inventario?',
                answer: 'Si el stock real no coincide con el sistema, editá el producto y modificá el campo "Stock actual". Esto corrige la diferencia.',
                keywords: ['ajuste', 'diferencia', 'corregir', 'inventario']
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
                question: '¿Cómo veo las ventas del día?',
                answer: 'En el Dashboard principal ves el resumen del día: total vendido, cantidad de ventas y ticket promedio. Para más detalle, andá a Reportes.',
                keywords: ['ventas', 'dia', 'total', 'resumen']
            },
            {
                question: '¿Cómo exporto reportes a Excel?',
                answer: 'En la sección Reportes, usá el botón "Exportar Excel" para descargar el detalle de ventas. Esta función está disponible en los planes Profesional y Business.',
                keywords: ['excel', 'exportar', 'descargar', 'reporte']
            },
            {
                question: '¿Cómo veo qué productos se venden más?',
                answer: 'En el Dashboard hay una sección "Top Productos del Mes" con los más vendidos. En Reportes podés ver estadísticas más detalladas.',
                keywords: ['top', 'mas vendido', 'popular', 'ranking']
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
                question: '¿Cuánto dura la prueba gratis?',
                answer: 'La prueba gratis dura 14 días e incluye todas las funciones del Plan Profesional. No se requiere tarjeta de crédito para empezar.',
                keywords: ['prueba', 'gratis', 'trial', 'dias']
            },
            {
                question: '¿Cómo me suscribo a un plan?',
                answer: 'Andá a Configuración y tocá el link "Cambiar de plan" en la sección Suscripción, o tocá el botón "Suscribirme ahora" del banner. Elegí el plan que prefieras y completá el pago con MercadoPago. Una vez confirmado el pago, el banner de prueba desaparece automáticamente y tu cuenta queda activa.',
                keywords: ['plan', 'suscribir', 'pagar', 'mercadopago', 'activar']
            },
            {
                question: '¿Cómo cambio de plan?',
                answer: 'Andá a Configuración y tocá el link "Cambiar de plan" en la sección Suscripción. Tu plan actual aparece marcado como "Plan Actual". Hacé clic en "Elegir Plan" en el plan al que querés cambiar y seguí los pasos.',
                keywords: ['plan', 'cambiar', 'upgrade', 'suscripcion']
            },
            {
                question: '¿Qué pasa si no pago?',
                answer: 'Si tu suscripción vence y no renovás, el acceso al sistema se suspende hasta que regularices el pago. Tus datos se mantienen seguros, pero no podrás usar la aplicación hasta completar el pago.',
                keywords: ['pago', 'vence', 'expira', 'cancelar', 'suspende']
            },
            {
                question: '¿Cómo configuro los datos de mi negocio?',
                answer: 'Andá a Configuración. Ahí podés cambiar el nombre del negocio, dirección, teléfono y otros datos. También podés gestionar las categorías de productos y ver el estado de tu suscripción.',
                keywords: ['configurar', 'negocio', 'datos', 'nombre']
            },
            {
                question: '¿Cómo invito a un empleado?',
                answer: 'Andá a Configuración > Gestión de Equipo. Ingresá el email del empleado y enviá la invitación. El empleado recibirá un correo para registrarse. Los empleados pueden hacer ventas pero no pueden editar productos, categorías ni ver reportes.',
                keywords: ['empleado', 'invitar', 'equipo', 'usuario', 'rol']
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
                    placeholder="Buscar: ¿Cómo hago una venta? ¿Qué es el SKU?..."
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
