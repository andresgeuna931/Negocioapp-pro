'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from '@/hooks/use-debounce';

interface Category {
    id: string;
    name: string;
}

interface ProductSearchProps {
    categories: Category[];
}

export function ProductSearch({ categories }: ProductSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleCategoryChange = (category: string) => {
        const params = new URLSearchParams(searchParams);
        if (category) {
            params.set('category', category);
        } else {
            params.delete('category');
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
                <Input
                    type="search"
                    placeholder="Buscar por nombre, código o SKU..."
                    defaultValue={searchParams.get('search') || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    icon={<Search className="w-5 h-5" />}
                />
            </div>

            {categories.length > 0 && (
                <select
                    className="h-12 px-4 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={searchParams.get('category') || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                >
                    <option value="">Todas las categorías</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            )}
        </div>
    );
}
