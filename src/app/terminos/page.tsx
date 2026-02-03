import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
    title: 'Términos y Condiciones',
};

export default function TerminosPage() {
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
                        Términos y Condiciones
                    </h1>
                    <p className="text-sm text-slate-500 mb-8">
                        Última actualización: Febrero 2026
                    </p>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold">1. Aceptación de los Términos</h2>
                            <p>
                                Al registrarte y utilizar NegocioApp Pro (&quot;el Servicio&quot;), aceptás estos
                                Términos y Condiciones. Si no estás de acuerdo, no utilices el Servicio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">2. Descripción del Servicio</h2>
                            <p>
                                NegocioApp Pro es un sistema de gestión comercial en la nube que permite:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Registro y control de ventas</li>
                                <li>Gestión de inventario y stock</li>
                                <li>Administración de clientes y cuentas corrientes</li>
                                <li>Generación de reportes</li>
                                <li>Acceso multi-dispositivo</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">3. Registro y Cuenta</h2>
                            <p>
                                Para usar el Servicio debés crear una cuenta proporcionando información
                                veraz y actualizada. Sos responsable de mantener la confidencialidad
                                de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">4. Planes y Pagos</h2>
                            <p>
                                El Servicio ofrece diferentes planes de suscripción con distintas
                                funcionalidades. Los pagos se procesan a través de Mercado Pago.
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Los precios pueden modificarse con aviso previo de 30 días</li>
                                <li>Las suscripciones se renuevan automáticamente</li>
                                <li>Podés cancelar en cualquier momento desde tu cuenta</li>
                                <li>Si el pago falla, el acceso se suspende hasta regularizar</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">5. Período de Prueba</h2>
                            <p>
                                Los nuevos usuarios reciben 14 días de prueba gratuita con acceso
                                completo al plan Profesional. Al finalizar, debés elegir un plan
                                pago para continuar usando el Servicio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">6. Uso Aceptable</h2>
                            <p>Te comprometés a:</p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Usar el Servicio solo para fines legales</li>
                                <li>No intentar acceder a cuentas de otros usuarios</li>
                                <li>No realizar ingeniería inversa del software</li>
                                <li>No sobrecargar intencionalmente los servidores</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">7. Propiedad de los Datos</h2>
                            <p>
                                Vos sos el propietario de todos los datos que cargás en el Servicio
                                (productos, ventas, clientes). Nosotros no utilizamos tus datos
                                comerciales para otros fines que no sean brindarte el Servicio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">8. Disponibilidad del Servicio</h2>
                            <p>
                                Nos esforzamos por mantener el Servicio disponible 24/7, pero no
                                garantizamos disponibilidad ininterrumpida. Pueden ocurrir
                                interrupciones por mantenimiento o causas ajenas a nuestro control.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">9. Limitación de Responsabilidad</h2>
                            <p>
                                NegocioApp Pro no se responsabiliza por pérdidas económicas derivadas
                                del uso del Servicio, errores en los datos ingresados por el usuario,
                                o decisiones comerciales tomadas en base a los reportes del sistema.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">10. Cancelación</h2>
                            <p>
                                Podés cancelar tu suscripción en cualquier momento. Al cancelar:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Mantenés acceso hasta el fin del período pago</li>
                                <li>Tus datos se conservan por 30 días para posible reactivación</li>
                                <li>Después de 30 días, los datos pueden ser eliminados</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">11. Modificaciones</h2>
                            <p>
                                Podemos modificar estos Términos notificándote por email con 15 días
                                de anticipación. El uso continuado del Servicio implica aceptación
                                de los nuevos términos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">12. Contacto</h2>
                            <p>
                                Para consultas sobre estos Términos, contactanos a:{' '}
                                <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-600 hover:underline">
                                    amgdigital.ok@gmail.com
                                </a>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold">13. Jurisdicción</h2>
                            <p>
                                Estos Términos se rigen por las leyes de la República Argentina.
                                Cualquier disputa se someterá a los tribunales ordinarios de la
                                Ciudad Autónoma de Buenos Aires.
                            </p>
                        </section>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/privacidad" className="text-emerald-600 hover:underline text-sm">
                        Ver Política de Privacidad
                    </Link>
                </div>
            </div>
        </div>
    );
}
