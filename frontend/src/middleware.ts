import { NextResponse, type NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:5000';

function buildCsp(nonce: string): string {
    const isDev = process.env.NODE_ENV !== 'production';
    return [
        `default-src 'self'`,
        `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : `'nonce-${nonce}' 'wasm-unsafe-eval'`}`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: blob:`,
        `font-src 'self'`,
        `connect-src 'self' https://api.pwnedpasswords.com${isDev ? ' ws: wss:' : ''}`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `object-src 'none'`,
    ].join('; ');
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/vault') || pathname.startsWith('/admin')) {
        if (!req.cookies.get('recipe.sid')) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        let session: { authenticated?: boolean; role?: string } | null = null;
        try {
            const res = await fetch(`${BACKEND}/api/auth/me`, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            });
            if (res.ok) session = await res.json();
        } catch {
            session = null;
        }
        if (!session?.authenticated) return NextResponse.redirect(new URL('/', req.url));
        if (pathname.startsWith('/admin') && session.role !== 'admin') {
            return NextResponse.redirect(new URL('/vault', req.url));
        }
    }

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const nonce = btoa(String.fromCharCode(...bytes));
    const csp = buildCsp(nonce);

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('content-security-policy', csp);

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('content-security-policy', csp);
    return res;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};