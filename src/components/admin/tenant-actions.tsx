'use client';

import { useState } from 'react';
import { activateTenantManual } from '@/lib/actions/admin-actions';
import { toast } from 'sonner';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CreditCard, MoreHorizontal, CheckCircle2, Loader2 } from 'lucide-react';

export function TenantActions({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleActivate = async (planId: string) => {
        if (!confirm(`¿Estás seguro de activar el plan ${planId.toUpperCase()} para ${tenantName}?`)) return;

        setIsLoading(true);
        try {
            const result = await activateTenantManual(tenantId, planId);
            if (result.success) {
                toast.success(`Plan ${planId.toUpperCase()} activado correctamente para ${tenantName}`);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-slate-500" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl z-[110]">
                <DropdownMenuLabel>Acciones de Gestión</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-xs font-normal text-slate-500">Activar Plan Manual</DropdownMenuLabel>
                <DropdownMenuItem 
                    disabled={isLoading}
                    onClick={() => handleActivate('starter')}
                    className="cursor-pointer"
                >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                    Activar STARTER
                </DropdownMenuItem>
                <DropdownMenuItem 
                    disabled={isLoading}
                    onClick={() => handleActivate('professional')}
                    className="cursor-pointer"
                >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" />
                    Activar PROFESIONAL
                </DropdownMenuItem>
                <DropdownMenuItem 
                    disabled={isLoading}
                    onClick={() => handleActivate('business')}
                    className="cursor-pointer"
                >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-purple-500" />
                    Activar BUSINESS
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
                    Suspender Negocio
                </DropdownMenuItem>
            </DropdownMenuContent>

            {isLoading && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[100] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
            )}
        </DropdownMenu>
    );
}
