'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, ShoppingBag, AlertTriangle, XCircle, CreditCard } from 'lucide-react';
import { getAdminNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/actions/admin-notifications';
import type { AdminNotification } from '@/lib/actions/admin-notifications';

function NotificationIcon({ type }: { type: string }) {
    switch (type) {
        case 'new_tenant': return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
        case 'subscription_expiring': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        case 'subscription_expired': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'payment_received': return <CreditCard className="w-4 h-4 text-blue-500" />;
        default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${days}d`;
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = async () => {
        const result = await getAdminNotifications();
        setNotifications(result.data);
        setUnreadCount(result.unreadCount);
        setLoading(false);
    };

    useEffect(() => {
        loadNotifications();
        // Polling cada 60 segundos
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Cerrar al hacer click afuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón campanita */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                            Notificaciones
                            {unreadCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Marcar todas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 text-sm">
                                Cargando...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                Sin notificaciones
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                        !notification.read ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        <NotificationIcon type={notification.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                            !notification.read
                                                ? 'text-slate-900 dark:text-white'
                                                : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {timeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <button
                                            onClick={() => handleMarkRead(notification.id)}
                                            className="shrink-0 p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Marcar como leída"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-center">
                            <p className="text-xs text-slate-400">
                                Últimas {notifications.length} notificaciones
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
