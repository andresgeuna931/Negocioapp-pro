import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/terminos', '/privacidad'];

// Routes accessible even when subscription is expired
const ALLOWED_ROUTES_WHEN_EXPIRED = [
    '/precios',
    '/suscripcion-vencida',
    '/config',
    '/ayuda',
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

    // Check if public route
    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // Get user session
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // If authenticated and trying to access login page
    if (user && isPublicRoute && (pathname === '/login' || pathname === '/register')) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // For authenticated users on protected routes, do a SIMPLE tenant check
    if (user && !isPublicRoute) {
        const isAllowedRoute = ALLOWED_ROUTES_WHEN_EXPIRED.some(route =>
            pathname.startsWith(route)
        );

        if (!isAllowedRoute) {
            // Simple query - only tenant status and created_at (no heavy joins)
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id, role, tenant:tenants(status, created_at)')
                .eq('id', user.id)
                .single();

            if (profile) {
                const tenantData = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;
                const tenantStatus = (tenantData as { status: string; created_at: string } | null)?.status;
                const tenantCreatedAt = (tenantData as { status: string; created_at: string } | null)?.created_at;

                // Check trial period (14 days from tenant creation)
                let isInTrial = false;
                if (tenantCreatedAt) {
                    const createdAt = new Date(tenantCreatedAt);
                    const trialEndDate = new Date(createdAt);
                    trialEndDate.setDate(trialEndDate.getDate() + 14);
                    isInTrial = new Date() < trialEndDate;
                }

                // Only block if tenant status clearly shows expired AND not in trial
                const isActive = tenantStatus && ['trial', 'active'].includes(tenantStatus);

                if (!isActive && !isInTrial) {
                    const url = request.nextUrl.clone();
                    url.pathname = '/suscripcion-vencida';
                    return NextResponse.redirect(url);
                }

                // Block writes if suspended
                if (tenantStatus === 'suspended') {
                    const writeRoutes = ['/productos/nuevo', '/ventas'];
                    const isWriteRoute = writeRoutes.some((route) =>
                        pathname.startsWith(route)
                    );
                    if (isWriteRoute) {
                        const url = request.nextUrl.clone();
                        url.pathname = '/suscripcion-vencida';
                        return NextResponse.redirect(url);
                    }
                }
            }
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
    ],
};
