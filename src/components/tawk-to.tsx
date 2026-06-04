'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

declare global {
    interface Window {
        Tawk_API?: any;
        Tawk_LoadStart?: Date;
    }
}

export function TawkToWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.Tawk_API) return;

        window.Tawk_API = {
            onLoad: function () {
                // Ocultar el botón nativo de Tawk
                window.Tawk_API?.hideWidget?.();
                setIsLoaded(true);
            },
            onChatMinimized: function () {
                setIsOpen(false);
            },
            onChatMaximized: function () {
                setIsOpen(true);
            }
        };

        window.Tawk_LoadStart = new Date();

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://embed.tawk.to/697d823d198b661c3837b08d/1jg949g53';
        script.charset = 'UTF-8';
        script.setAttribute('crossorigin', '*');

        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);

        return () => {
            const tawkScript = document.querySelector('script[src*="tawk.to"]');
            if (tawkScript) tawkScript.remove();
            delete window.Tawk_API;
        };
    }, []);

    const handleToggle = () => {
        if (!isLoaded) return;
        if (isOpen) {
            window.Tawk_API?.minimize?.();
            setIsOpen(false);
        } else {
            window.Tawk_API?.maximize?.();
            setIsOpen(true);
        }
    };

    if (!isLoaded) return null;

    return (
        <button
            onClick={handleToggle}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm transition-all hover:scale-105"
            style={{ backgroundColor: '#274234' }}
        >
            {isOpen ? (
                <X className="w-5 h-5" />
            ) : (
                <MessageCircle className="w-5 h-5" />
            )}
            {!isOpen && <span>Soporte Virtual</span>}
        </button>
    );
}
