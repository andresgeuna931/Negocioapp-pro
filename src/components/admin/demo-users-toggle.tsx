'use client';

import { useState, useTransition } from 'react';
import { toggleDemoUser } from '@/lib/actions/admin';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, User, Users } from 'lucide-react';

interface Props {
    initialOwner: boolean;
    initialStaff: boolean;
}

export function DemoUsersToggle({ initialOwner, initialStaff }: Props) {
    const [ownerEnabled, setOwnerEnabled] = useState(initialOwner);
    const [staffEnabled, setStaffEnabled] = useState(initialStaff);
    const [isPendingOwner, startOwner] = useTransition();
    const [isPendingStaff, startStaff] = useTransition();

    const handleToggle = (
        role: 'owner' | 'staff',
        current: boolean,
        setter: (v: boolean) => void,
        start: (fn: () => void) => void
    ) => {
        const next = !current;
        setter(next);
        start(async () => {
            const result = await toggleDemoUser(role, next);
            if (!result.success) {
                setter(current); // revertir
                toast.error(`Error al ${next ? 'habilitar' : 'deshabilitar'} usuario demo: ${result.error}`);
            } else {
                toast.success(`Demo ${role === 'owner' ? 'Dueño' : 'Empleado'} ${next ? 'habilitado' : 'deshabilitado'}`);
            }
        });
    };

    return (
        <Card>
            <CardContent className="pt-5 space-y-4">
                {/* Demo Dueño */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                            <User className="w-4 h-4 text-violet-500" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">Demo Dueño</p>
                            <p className="text-xs text-slate-500">demo-dueno@negocioapp.pro</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${ownerEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {ownerEnabled ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                        {isPendingOwner ? (
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        ) : (
                            <button
                                onClick={() => handleToggle('owner', ownerEnabled, setOwnerEnabled, startOwner)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    ownerEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    ownerEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Demo Empleado */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">Demo Empleado</p>
                            <p className="text-xs text-slate-500">demo-empleado@negocioapp.pro</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${staffEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {staffEnabled ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                        {isPendingStaff ? (
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        ) : (
                            <button
                                onClick={() => handleToggle('staff', staffEnabled, setStaffEnabled, startStaff)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    staffEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    staffEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
