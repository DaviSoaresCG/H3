import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwtEdge } from '@/lib/auth-edge';

function getRoleRedirectPath(role: string): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/ponto';
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('eventpoint_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Recursos estáticos públicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next();
  }

  // 2. Rota de Login e APIs públicas de Auth
  if (pathname === '/login' || pathname.startsWith('/api/auth/login')) {
    if (token) {
      const payload = await verifyJwtEdge(token);
      if (payload) {
        return NextResponse.redirect(new URL(getRoleRedirectPath(payload.role), request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Raiz da aplicação: Redireciona conforme autenticação válida
  if (pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const payload = await verifyJwtEdge(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL(getRoleRedirectPath(payload.role), request.url));
  }

  // 4. Verificação de Rotas Protegidas do App e APIs
  const isProtectedAppRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/ponto') ||
    pathname.startsWith('/frota') ||
    pathname.startsWith('/tecnicas') ||
    pathname.startsWith('/viagens');

  if (isProtectedAppRoute) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyJwtEdge(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('eventpoint_token');
      return response;
    }

    // Restrição RBAC: /admin/* restrito a ADMIN (INV-04)
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/ponto', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/ponto/:path*',
    '/frota/:path*',
    '/tecnicas/:path*',
    '/viagens/:path*',
  ],
};
