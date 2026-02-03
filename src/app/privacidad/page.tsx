import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
    title: 'Política de Privacidad',
};

export default function PrivacidadPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                </Link>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Política de Privacidad
                    </h1>
                    <p className="text-sm text-slate-500 mb-8">
                        Última actualización: Febrero 2026
                    </p>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold">1. Información que Recopilamos</h2>
                            <p>Recopilamos la siguiente información:</p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Datos de cuenta:</strong> Email, nombre, nombre del negocio</li>
                                <li><strong>Datos comerciales:</strong> Productos, ventas, clientes, stock (los que vos cargás)</li>
                                <li><strong>Datos de uso:</strong> Páginas visitadas, funciones utilizadas</li>
                                <li><strong>Datos técnicos:</strong> Tipo de dispositivo, navegador, IP</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">2. Cómo Usamos tu Información</h2>
                            <p>Utilizamos tus datos para:</p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Brindarte el servicio de gestión comercial</li>
                                <li>Procesar pagos de suscripción</li>
                                <li>Enviarte notificaciones importantes del servicio</li>
                                <li>Mejorar la plataforma basándonos en patrones de uso</li>
                                <li>Brindarte soporte técnico</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">3. Almacenamiento de Datos</h2>
                            <p>
                                Tus datos se almacenan en servidores seguros proporcionados por
                                Supabase (infraestructura de Amazon Web Services). Los datos
                                están encriptados en tránsito y en reposo.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">4. Compartición de Datos</h2>
                            <p>
                                <strong>No vendemos ni compartimos tus datos comerciales con terceros.</strong>
                            </p>
                            <p>Solo compartimos información con:</p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Mercado Pago:</strong> Para procesar los pagos de tu suscripción</li>
                                <li><strong>Proveedores de infraestructura:</strong> Supabase, Vercel (hosting)</li>
                                <li><strong>Autoridades:</strong> Si la ley lo requiere</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">5. Tus Derechos</h2>
                            <p>Tenés derecho a:</p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Acceder:</strong> Solicitar una copia de tus datos</li>
                                <li><strong>Rectificar:</strong> Corregir datos inexactos</li>
                                <li><strong>Eliminar:</strong> Solicitar la eliminación de tu cuenta y datos</li>
                                <li><strong>Exportar:</strong> Descargar tus datos en formato estándar</li>
                            </ul>
                            <p>
                                Para ejercer estos derechos, contactanos a{' '}
                                <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-600 hover:underline">
                                    amgdigital.ok@gmail.com
                                </a>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">6. Cookies</h2>
                            <p>
                                Utilizamos cookies esenciales para mantener tu sesión activa y
                                recordar tus preferencias. No utilizamos cookies de publicidad
                                ni de seguimiento de terceros.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">7. Retención de Datos</h2>
                            <p>
                                Conservamos tus datos mientras tengas una cuenta activa. Si
                                cancelás tu suscripción, los datos se mantienen por 30 días
                                adicionales y luego pueden ser eliminados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">8. Seguridad</h2>
                            <p>
                                Implementamos medidas de seguridad incluyendo:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Encriptación SSL/TLS en todas las comunicaciones</li>
                                <li>Contraseñas hasheadas (nunca almacenamos contraseñas en texto plano)</li>
                                <li>Acceso restringido a bases de datos</li>
                                <li>Backups periódicos</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">9. Menores de Edad</h2>
                            <p>
                                NegocioApp Pro está destinado a uso comercial por personas
                                mayores de 18 años. No recopilamos intencionalmente datos
                                de menores.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">10. Cambios a esta Política</h2>
                            <p>
                                Podemos actualizar esta política ocasionalmente. Te notificaremos
                                cambios significativos por email. La fecha de última actualización
                                aparece al inicio del documento.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">11. Contacto</h2>
                            <p>
                                Para consultas sobre privacidad:{' '}
                                <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-600 hover:underline">
                                    amgdigital.ok@gmail.com
                                </a>
                            </p>
                        </section>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/terminos" className="text-emerald-600 hover:underline text-sm">
                        Ver Términos y Condiciones
                    </Link>
                </div>
            </div>
        </div>
    );
}
