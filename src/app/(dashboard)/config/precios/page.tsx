'use client';
import { getCurrentSession } from '@/lib/actions/auth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Tag,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Star,
    Percent,
    DollarSign,
    ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    getAllPriceLists,
    createPriceList,
    updatePriceList,
    deletePriceList,
    type PriceList,
} from '@/lib/actions/price-lists';
import Link from 'next/link';

export default function PriceListsPage() {
    // F-02: verificar rol al montar — redirigir si es staff
    useEffect(() => {
        getCurrentSession().then(session => {
            if (session?.profile?.role === 'staff') {
                router.replace('/');
            }
        });
    }, [router]);

    const router = useRouter();
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        adjustment_type: 'percentage' as 'percentage' | 'fixed',
        adjustment_value: 0,
        is_default: false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Load price lists
    const loadPriceLists = async () => {
        setLoading(true);
        const result = await getAllPriceLists();
        if (result.data) {
            setPriceLists(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPriceLists();
    }, []);

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            adjustment_type: 'percentage',
            adjustment_value: 0,
            is_default: false,
        });
        setEditingId(null);
        setShowForm(false);
        setError('');
    };

    // Handle edit
    const handleEdit = (list: PriceList) => {
        setFormData({
            name: list.name,
            description: list.description || '',
            adjustment_type: list.adjustment_type,
            adjustment_value: list.adjustment_value,
            is_default: list.is_default,
        });
        setEditingId(list.id);
        setShowForm(true);
    };

    // Handle save
    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (editingId) {
                const result = await updatePriceList(editingId, formData);
                if (result.error) {
                    setError(result.error);
                    return;
                }
            } else {
                const result = await createPriceList(formData);
                if (result.error) {
                    setError(result.error);
                    return;
                }
            }

            await loadPriceLists();
            resetForm();
        } finally {
            setSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta lista de precios?')) {
            return;
        }

        const result = await deletePriceList(id);
        if (result.error) {
            alert(result.error);
            return;
        }

        await loadPriceLists();
    };

    // Handle set default
    const handleSetDefault = async (id: string) => {
        await updatePriceList(id, { is_default: true });
        await loadPriceLists();
    };

    // Format adjustment display
    const formatAdjustment = (list: PriceList) => {
        if (list.adjustment_value === 0) return 'Precio base';
        const sign = list.adjustment_value > 0 ? '+' : '';
        if (list.adjustment_type === 'percentage') {
            return `${sign}${list.adjustment_value}%`;
        }
        return `${sign}$${list.adjustment_value}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/config">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Listas de Precios
                        </h1>
                        <p className="text-slate-500">
                            Configurá diferentes precios para efectivo, tarjeta, mayorista, etc.
                        </p>
                    </div>
                </div>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Nueva Lista
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {editingId ? 'Editar Lista' : 'Nueva Lista de Precios'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-100 text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nombre *
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ej: Tarjeta, Mayorista"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Descripción
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ej: Precio con recargo por tarjeta"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tipo de ajuste
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, adjustment_type: 'percentage' })}
                                        className={`flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-colors ${formData.adjustment_type === 'percentage'
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <Percent className="w-4 h-4" />
                                        Porcentaje
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, adjustment_type: 'fixed' })}
                                        className={`flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-colors ${formData.adjustment_type === 'fixed'
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Monto fijo
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ajuste {formData.adjustment_type === 'percentage' ? '(%)' : '($)'}
                                </label>
                                <Input
                                    type="number"
                                    step={formData.adjustment_type === 'percentage' ? '0.5' : '1'}
                                    placeholder={formData.adjustment_type === 'percentage' ? 'Ej: 5 para +5%' : 'Ej: 50 para +$50'}
                                    value={formData.adjustment_value || ''}
                                    onChange={(e) => setFormData({ ...formData, adjustment_value: parseFloat(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Usá números negativos para descuentos (ej: -10 para -10%)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300"
                            />
                            <label htmlFor="is_default" className="text-sm text-slate-700 dark:text-slate-300">
                                Establecer como lista predeterminada
                            </label>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={resetForm}>
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} loading={saving}>
                                <Check className="w-4 h-4 mr-2" />
                                {editingId ? 'Guardar Cambios' : 'Crear Lista'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Price Lists */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Listas Configuradas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-12 text-center text-slate-500">
                            Cargando...
                        </div>
                    ) : priceLists.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            No hay listas de precios configuradas
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {priceLists.map((list) => (
                                <div
                                    key={list.id}
                                    className={`p-4 rounded-xl border ${list.is_default
                                        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${list.is_default
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                <Tag className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-slate-900 dark:text-white">
                                                        {list.name}
                                                    </h3>
                                                    {list.is_default && (
                                                        <Badge variant="info" size="sm">
                                                            <Star className="w-3 h-3 mr-1" />
                                                            Predeterminada
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant={list.adjustment_value > 0 ? 'warning' : list.adjustment_value < 0 ? 'success' : 'default'}
                                                        size="sm"
                                                    >
                                                        {formatAdjustment(list)}
                                                    </Badge>
                                                </div>
                                                {list.description && (
                                                    <p className="text-sm text-slate-500">
                                                        {list.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!list.is_default && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetDefault(list.id)}
                                                >
                                                    <Star className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(list)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            {!list.is_default && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(list.id)}
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Help */}
            <Card>
                <CardContent className="py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="font-medium mb-2">💡 ¿Cómo funciona?</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Creá listas como "Efectivo", "Tarjeta" (+5%), "Mayorista" (-15%)</li>
                            <li>Al vender, elegí la lista y el precio se ajusta automáticamente</li>
                            <li>También podés poner precios fijos por producto en cada lista</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
