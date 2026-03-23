import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/terminos', '/privacidad', '/unirse'];

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

    // Refresh session - this is required by Supabase
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If not authenticated and trying to access protected route → login
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // If authenticated and on login/register → dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // NOTE: Subscription and tenant checks are done in the dashboard layout,
    // NOT here. This keeps the middleware fast and avoids Vercel timeouts.

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api|icons|manifest).*)',
    ],
};
