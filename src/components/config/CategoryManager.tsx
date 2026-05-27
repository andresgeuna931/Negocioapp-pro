'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/actions/products';

interface Category {
    id: string;
    name: string;
}

export function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const loadCategories = async () => {
        const { data } = await getCategories();
        if (data) setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        setError('');
        const { error } = await createCategory(newName);
        if (error) {
            setError(error);
        } else {
            setNewName('');
            await loadCategories();
        }
        setSaving(false);
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;
        setSaving(true);
        setError('');
        const { error } = await updateCategory(id, editingName);
        if (error) {
            setError(error);
        } else {
            setEditingId(null);
            setEditingName('');
            await loadCategories();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la categoría "${name}"? Los productos de esta categoría quedarán sin categoría.`)) return;
        setSaving(true);
        setError('');
        const { error } = await deleteCategory(id);
        if (error) {
            setError(error);
        } else {
            await loadCategories();
        }
        setSaving(false);
    };

    if (loading) {
        return <p className="text-slate-500 text-sm">Cargando categorías...</p>;
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Lista de categorías */}
            <div className="space-y-2">
                {categories.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">
                        No hay categorías. Agregá la primera.
                    </p>
                )}
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                        {editingId === cat.id ? (
                            <>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleUpdate(cat.id)}
                                    disabled={saving}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setEditingId(null); setEditingName(''); }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">
                                    {cat.name}
                                </span>
                                <button
                                    onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id, cat.name)}
                                    disabled={saving}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Agregar nueva categoría */}
            <div className="flex gap-2 pt-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Nueva categoría..."
                    className="flex-1 h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                    onClick={handleCreate}
                    disabled={saving || !newName.trim()}
                    className="h-11 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Agregar
                </button>
            </div>
        </div>
    );
}
