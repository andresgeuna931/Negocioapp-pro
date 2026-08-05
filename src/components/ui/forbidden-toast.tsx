'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function ForbiddenToast() {
    useEffect(() => {
        toast.error('No tenés permiso para acceder a esa sección', {
            duration: 4000,
        });
    }, []);

    return null;
}
