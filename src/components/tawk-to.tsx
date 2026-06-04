'use client';
import { useEffect } from 'react';

declare global {
    interface Window {
        Tawk_API?: any;
        Tawk_LoadStart?: Date;
    }
}

export function TawkToWidget() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.Tawk_API) return;

        window.Tawk_API = {
            autoStart: false,
            onLoad: function () {
                window.Tawk_API?.hideWidget?.();
                setTimeout(() => {
                    window.Tawk_API?.showWidget?.();
                    window.Tawk_API?.minimize?.();
                }, 500);
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

    return null;
}
