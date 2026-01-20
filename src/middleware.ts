import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

    // Get user session
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register', '/forgot-password'];
    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // If authenticated and trying to access login page
    if (user && isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // Check tenant status for protected routes
    if (user && !isPublicRoute) {
        // Get user profile and tenant status
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role, tenant:tenants(status)')
            .eq('id', user.id)
            .single();

        if (profile) {
            // Handle the case where tenant might be an array or object
            const tenantData = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;
            const tenantStatus = (tenantData as { status: string } | null)?.status;

            // Write operations are blocked for suspended tenants
            const writeRoutes = ['/productos/nuevo', '/ventas', '/config'];
            const isWriteRoute = writeRoutes.some((route) =>
                pathname.startsWith(route)
            );

            if (tenantStatus === 'suspended' && isWriteRoute) {
                const url = request.nextUrl.clone();
                url.pathname = '/suspended';
                return NextResponse.redirect(url);
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
