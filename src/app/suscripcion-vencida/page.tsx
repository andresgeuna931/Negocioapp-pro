import Link from 'next/link';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SubscriptionExpiredPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Suscripción vencida
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Tu período de prueba o suscripción ha finalizado.
                        Para seguir usando NegocioApp Pro, elegí un plan de pago.
                    </p>

                    <div className="space-y-3">
                        <Link href="/precios" className="block">
                            <Button className="w-full" size="lg">
                                <CreditCard className="w-5 h-5 mr-2" />
                                Ver Planes y Pagar
                            </Button>
                        </Link>

                        <p className="text-xs text-slate-500">
                            Tus datos están seguros. Al pagar, recuperás el acceso completo.
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500 mb-2">¿Necesitás ayuda?</p>
                        <a
                            href="mailto:amgdigital.ok@gmail.com"
                            className="text-emerald-600 hover:underline text-sm"
                        >
                            amgdigital.ok@gmail.com
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
