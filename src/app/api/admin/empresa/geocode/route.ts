import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { searchAddressCoordinates } from '@/lib/geocoding';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim() || query.trim().length < 3) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results = await searchAddressCoordinates(query);
    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error('[API Geocode Error]:', error);
    return NextResponse.json({ error: 'Erro ao buscar coordenadas' }, { status: 500 });
  }
}
