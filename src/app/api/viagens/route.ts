import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const trips = await query('SELECT * FROM trips ORDER BY start_date DESC');
    return NextResponse.json({ success: true, trips });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar viagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    // Apenas ADMIN pode cadastrar viagens
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Autorização necessária (Apenas Administrador)' }, { status: 403 });
    }

    const body = await request.json();
    const { title, destinationCity, startDate, endDate, dailyAllowanceCentavos } = body as {
      title: string;
      destinationCity: string;
      startDate: string;
      endDate: string;
      dailyAllowanceCentavos?: number;
    };

    if (!title || !destinationCity || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Título, cidade de destino, data inicial e data final são obrigatórios' },
        { status: 400 }
      );
    }

    const allowance = dailyAllowanceCentavos || DAILY_TRAVEL_ALLOWANCE_CENTAVOS; // Default R$ 150,00
    const tripId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await query(
      `INSERT INTO trips (id, title, destination_city, start_date, end_date, daily_allowance_centavos, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tripId, title, destinationCity, startDate, endDate, allowance, createdAt]
    );

    return NextResponse.json({
      success: true,
      trip: {
        id: tripId,
        title,
        destinationCity,
        startDate,
        endDate,
        dailyAllowanceCentavos: allowance,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao agendar viagem' }, { status: 500 });
  }
}
