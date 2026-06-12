'use client';

import Link from 'next/link';
import { Menu, Bell, User, LogOut, ShieldCheck } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Badge } from '@/components/ui/badge';
import type { UserSession } from '@/lib/types';

interface HeaderProps {
    onMenuClick: () => void;
    session: UserSession | null;
}

export function Header({ onMenuClick, session }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {session?.tenant && (
                        <div className="hidden sm:block">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {session.tenant.name}
                            </h2>
                        </div>
                    )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Subscription status */}
                    {session?.tenant && (
                        <Badge
                            variant={
                                session.tenant.status === 'active' ? 'success' :
                                    session.tenant.status === 'trial' ? 'info' :
                                        session.tenant.status === 'past_due' ? 'warning' : 'danger'
                            }
                            size="sm"
                            className="hidden sm:inline-flex"
                        >
                            {session.tenant.status === 'active' ? 'Activo' :
                                session.tenant.status === 'trial' ? 'Prueba' :
                                    session.tenant.status === 'past_due' ? 'Vencido' : 'Suspendido'}
                        </Badge>
                    )}

                    {/* Admin Link */}
                    {session?.profile?.role === 'admin' && (
                        <Link 
                            href="/admin" 
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 transition-colors mr-2"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span className="hidden md:inline">Admin Panel</span>
                        </Link>
                    )}

                    {/* Notifications */}
                    {session?.profile?.role === 'admin' ? (
                        <NotificationBell />
                    ) : (
                        <button className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                    )}

                    {/* User menu */}
                    <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {session?.profile?.full_name || 'Usuario'}
                            </p>
                            <p className="text-xs text-slate-500">
                                {session?.profile?.role === 'admin' ? 'Administrador' : 
                                 session?.profile?.role === 'owner' ? 'Dueño' : 'Empleado'}
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-400 transition-all text-sm font-medium"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </header>
    );
}
