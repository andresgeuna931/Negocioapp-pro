import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { EmployeeRegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ token: string }>;
}

export default async function EmployeeJoinPage({ params }: Props) {
    const { token } = await params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
        notFound();
    }

    // Usar admin client para bypassear RLS (igual que tenant-invitations)
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invitation } = await adminSupabase
        .from('team_invitations')
        .select('*, tenant:tenants(name)')
        .eq('id', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

    const businessName = invitation
        ? (Array.isArray(invitation.tenant) ? invitation.tenant[0]?.name : (invitation.tenant as any)?.name) ?? 'el negocio'
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            {!invitation ? (
                <Card variant="glass" className="w-full max-w-md relative">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Invitación no válida
                        </h2>
                        <p className="text-slate-400 mb-6">
                            Invitación no encontrada o expirada.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            Los links de invitación vencen en 7 días
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-700">
                            <Link href="/login" className="text-emerald-400 hover:underline text-sm">
                                Ir a iniciar sesión
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <EmployeeRegisterForm token={token} businessName={businessName!} />
            )}
        </div>
    );
}
