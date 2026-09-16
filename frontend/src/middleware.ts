import { NextResponse, type NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

export async function middleware(req: NextRequest) {
    const cookie = req.headers.get('cookie') ?? '';
    if (!req.cookies.get('recipe.sid')) {
        return NextResponse.redirect(new URL('/', req.url));
    }
    let session: { authenticated?: boolean; role?: string } | null = null;
    try {
        const res = await fetch(`${BACKEND}/api/auth/me`, { headers: { cookie } });
        if (res.ok) session = await res.json();
    } catch {
        session = null;
    }

    if (!session?.authenticated) {
        return NextResponse.redirect(new URL('/', req.url));
    }
    if (req.nextUrl.pathname.startsWith('/admin') && session.role !== 'admin') {
        return NextResponse.redirect(new URL('/vault', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/vault/:path*', '/admin/:path*'],
};