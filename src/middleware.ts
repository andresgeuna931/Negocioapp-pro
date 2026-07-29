import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/terminos', '/privacidad', '/unirse', '/api/webhooks', '/api/telegram', '/precios', '/register-invited'];

// F-02: rutas restringidas para staff — el servidor redirige antes de enviar contenido
const STAFF_RESTRICTED_ROUTES = [
    '/config/precios',
    '/config',
    '/gastos',
    '/productos/nuevo',
    '/productos/precios',
];

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const pathname = request.nextUrl.pathname;

    // Bloquear /register directamente — acceso solo por invitación
    if (pathname === '/register' || pathname.startsWith('/register/')) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    if (user && pathname === '/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // Verificar perfil una sola vez para rol y demo
    if (user && !isPublicRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_demo_disabled')
            .eq('id', user.id)
            .single();

        // ─── USUARIO DEMO DESHABILITADO ───────────────────────────────────────
        if (profile?.is_demo_disabled && profile?.role !== 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = '/demo-suspended';
            if (pathname !== '/demo-suspended') {
                return NextResponse.redirect(url);
            }
            return supabaseResponse;
        }

        // F-02: verificar rol para rutas restringidas
        const isRestrictedRoute = STAFF_RESTRICTED_ROUTES.some((route) =>
            pathname.startsWith(route)
        );

        if (isRestrictedRoute && profile?.role === 'staff') {
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api|icons|manifest).*)',
    ],
};
