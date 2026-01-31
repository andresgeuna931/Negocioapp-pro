'use client';

import { useEffect } from 'react';

declare global {
    interface Window {
        Tawk_API?: object;
        Tawk_LoadStart?: Date;
    }
}

export function TawkToWidget() {
    useEffect(() => {
        // Only load in browser
        if (typeof window === 'undefined') return;

        // Prevent duplicate loading
        if (window.Tawk_API) return;

        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_LoadStart = new Date();

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://embed.tawk.to/697d823d198b661c3837b08d/1jg949g53';
        script.charset = 'UTF-8';
        script.setAttribute('crossorigin', '*');

        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);

        return () => {
            // Cleanup on unmount (optional)
            const tawkScript = document.querySelector('script[src*="tawk.to"]');
            if (tawkScript) {
                tawkScript.remove();
            }
        };
    }, []);

    return null; // This component doesn't render anything visible
}
