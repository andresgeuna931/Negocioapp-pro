'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateTenantSettings } from '@/lib/actions/auth';
import type { Tenant } from '@/lib/types';

interface TenantSettingsFormProps {
    tenant: Tenant;
}

export function TenantSettingsForm({ tenant }: TenantSettingsFormProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await updateTenantSettings({
                name: formData.get('name') as string,
                address: formData.get('address') as string || undefined,
                phone: formData.get('phone') as string || undefined,
                email: formData.get('email') as string || undefined,
                low_stock_threshold_default: parseFloat(formData.get('threshold') as string) || 5,
            });

            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al guardar' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
                <div className={`p-3 rounded-xl text-sm ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <Input
                name="name"
                label="Nombre del negocio"
                defaultValue={tenant.name}
                required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    name="phone"
                    label="Teléfono"
                    defaultValue={tenant.phone || ''}
                    placeholder="11-1234-5678"
                />
                <Input
                    name="email"
                    type="email"
                    label="Email"
                    defaultValue={tenant.email || ''}
                    placeholder="contacto@tunegocio.com"
                />
            </div>

            <Input
                name="address"
                label="Dirección"
                defaultValue={tenant.address || ''}
                placeholder="Av. Corrientes 1234, CABA"
            />

            <Input
                name="threshold"
                type="number"
                min="0"
                step="1"
                label="Umbral de stock bajo (por defecto)"
                defaultValue={tenant.low_stock_threshold_default}
            />

            <Button type="submit" loading={loading}>
                <Save className="w-5 h-5 mr-2" />
                Guardar Cambios
            </Button>
        </form>
    );
}
