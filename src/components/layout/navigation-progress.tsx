'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';

// Configurar NProgress una sola vez
NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.08 });

export function NavigationProgress() {
    const pathname = usePathname();
    const prevPathname = useRef(pathname);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (prevPathname.current !== pathname) {
            // Ruta cambió → parar la barra (navegación completada)
            NProgress.done();
            prevPathname.current = pathname;
            if (timer.current) clearTimeout(timer.current);
        }
    }, [pathname]);

    return (
        <style>{`
            #nprogress { pointer-events: none; }
            #nprogress .bar {
                background: #10b981;
                position: fixed;
                z-index: 9999;
                top: 0; left: 0;
                width: 100%; height: 3px;
            }
            #nprogress .peg {
                display: block;
                position: absolute;
                right: 0; width: 100px; height: 100%;
                box-shadow: 0 0 10px #10b981, 0 0 5px #10b981;
                opacity: 1;
                transform: rotate(3deg) translate(0px,-4px);
            }
        `}</style>
    );
}

// Hook para usar en los links del sidebar
export function startNavProgress() {
    NProgress.start();
}
