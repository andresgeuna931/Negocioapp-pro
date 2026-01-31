import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes accessible even when subscription is expired
const ALLOWED_ROUTES_WHEN_EXPIRED = [
    '/precios',
    '/suscripcion-vencida',
    '/configuracion',
    '/api',
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

    // Check subscription status for protected routes
    if (user && !isPublicRoute) {
        // Check if current route is allowed when expired
        const isAllowedRoute = ALLOWED_ROUTES_WHEN_EXPIRED.some(route =>
            pathname.startsWith(route)
        );

        // Get user profile with tenant and subscription
        const { data: profile } = await supabase
            .from('profiles')
            .select(`
                tenant_id, 
                role, 
                tenant:tenants(status, created_at),
                subscription:subscriptions(status, plan_id, current_period_end)
            `)
            .eq('id', user.id)
            .single();

        if (profile && !isAllowedRoute) {
            const tenantData = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;
            const subscriptionData = Array.isArray(profile.subscription) ? profile.subscription[0] : profile.subscription;

            const tenantStatus = (tenantData as { status: string; created_at: string } | null)?.status;
            const tenantCreatedAt = (tenantData as { status: string; created_at: string } | null)?.created_at;

            // Check subscription status
            const subscriptionStatus = (subscriptionData as { status: string } | null)?.status;
            const hasActiveSubscription = subscriptionStatus && ['active', 'trial'].includes(subscriptionStatus);

            // Check trial period (14 days from tenant creation)
            let isInTrial = false;
            if (tenantCreatedAt) {
                const createdAt = new Date(tenantCreatedAt);
                const trialEndDate = new Date(createdAt);
                trialEndDate.setDate(trialEndDate.getDate() + 14);
                isInTrial = new Date() < trialEndDate;
            }

            // Block access if no active subscription AND trial expired
            if (!hasActiveSubscription && !isInTrial) {
                const url = request.nextUrl.clone();
                url.pathname = '/suscripcion-vencida';
                return NextResponse.redirect(url);
            }

            // Also block if tenant is suspended (different from expired subscription)
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
