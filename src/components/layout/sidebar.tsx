'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    BarChart3,
    AlertTriangle,
    Settings,
    HelpCircle,
    X,
    Wallet,
    ClipboardList,
    Users,
    Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    planName?: string;
}

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/ventas', label: 'Venta Rápida', icon: ShoppingCart },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/stock', label: 'Stock Bajo', icon: AlertTriangle },
    { href: '/caja', label: 'Caja', icon: Wallet },
    { href: '/gastos', label: 'Gastos', icon: Receipt },
    { href: '/inventario', label: 'Inventario', icon: ClipboardList },
    { href: '/reportes', label: 'Reportes', icon: BarChart3 },
    { href: '/config', label: 'Configuración', icon: Settings },
    { href: '/ayuda', label: 'Ayuda', icon: HelpCircle },
];

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

export function Sidebar({ isOpen, onClose, planName }: SidebarProps) {
    const pathname = usePathname();
    const isBusiness = planName?.toLowerCase().includes('business');

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside className={cn(
                'fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
                isOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">NegocioApp Pro</span>
                    </Link>
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}

                    {isBusiness && (
                        <button
                            onClick={() => { window.open('https://t.me/negocioapp_soporte_bot', '_blank'); onClose(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] hover:text-white mt-2"
                        >
                            <TelegramIcon />
                            <span className="flex-1 text-left">Soporte VIP</span>
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">24/7</span>
                        </button>
                    )}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 text-center">
                        NegocioApp Pro v1.0
                    </div>
                </div>
            </aside>
        </>
    );
}
