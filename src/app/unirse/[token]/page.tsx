import { notFound } from 'next/navigation';
import { validateInvitationToken } from '@/lib/actions/tenant-invitations';
import { RegisterForm } from './register-form';
import { AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface JoinPageProps {
    params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { token } = await params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
        notFound();
    }

    const result = await validateInvitationToken(token);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            {!result.valid ? (
                <Card variant="glass" className="w-full max-w-md relative">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Invitación no válida
                        </h2>
                        <p className="text-slate-400 mb-6">
                            {result.reason}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            Los links de invitación vencen en 48 horas
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-700">
                            <Link href="/login" className="text-emerald-400 hover:underline text-sm">
                                Ir a iniciar sesión
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <RegisterForm
                    token={token}
                    plan={result.plan!}
                    invitation={result.invitation!}
                />
            )}
        </div>
    );
}
