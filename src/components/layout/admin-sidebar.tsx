'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Settings,
    ShieldCheck,
    ChevronLeft,
    X,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const adminNavItems = [
    {
        href: '/admin',
        label: 'Resumen Global',
        icon: LayoutDashboard,
    },
    {
        href: '/admin/tenants',
        label: 'Negocios / Clientes',
        icon: Building2,
    },
    {
        href: '/admin/settings',
        label: 'Configuración Sistema',
        icon: Settings,
    },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-72 bg-slate-950 transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
                    <Link href="/admin" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Admin Panel</span>
                    </Link>
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {adminNavItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Volver a la App
                        </Link>
                    </div>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-950">
                    <div className="text-[10px] uppercase tracking-widest text-slate-600 text-center font-bold">
                        Super Admin Mode
                    </div>
                </div>
            </aside>
        </>
    );
}
