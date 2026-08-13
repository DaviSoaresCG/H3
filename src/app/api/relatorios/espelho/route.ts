import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || payload.userId;
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);

    const employee = await queryOne('SELECT id, cpf, name, phone, role FROM users WHERE id = $1', [userId]);

    const entries = await query(
      `SELECT t.*, a.transcription_text 
       FROM time_entries t
       LEFT JOIN audio_diaries a ON a.time_entry_id = t.id
       WHERE t.user_id = $1 AND to_char(t.timestamp, 'YYYY-MM') = $2
       ORDER BY t.timestamp ASC`,
      [userId, month]
    );

    const techniqueServices = await query(
      `SELECT * FROM event_technique_services 
       WHERE user_id = $1 AND to_char(service_date, 'YYYY-MM') = $2
       ORDER BY service_date ASC`,
      [userId, month]
    );

    const totalTechniquesCount = techniqueServices.reduce((acc, curr) => acc + curr.techniques_count, 0);
    const totalTechniquesCentavos = techniqueServices.reduce((acc, curr) => acc + Number(curr.total_amount_centavos), 0);

    const trips = await query(
      `SELECT * FROM trips 
       WHERE to_char(start_date, 'YYYY-MM') = $1`,
      [month]
    );

    const travelDaysCount = trips.length * 2;
    const totalTravelAllowancesCentavos = travelDaysCount * DAILY_TRAVEL_ALLOWANCE_CENTAVOS;
    const grandTotalCentavos = totalTechniquesCentavos + totalTravelAllowancesCentavos;

    return NextResponse.json({
      success: true,
      month,
      employee,
      entries,
      summary: {
        entriesCount: entries.length,
        techniquesCount: totalTechniquesCount,
        totalTechniquesAmountReais: (totalTechniquesCentavos / 100).toFixed(2),
        travelDaysCount,
        totalTravelAllowancesReais: (totalTravelAllowancesCentavos / 100).toFixed(2),
        grandTotalReais: (grandTotalCentavos / 100).toFixed(2),
      },
      techniqueServices,
      trips,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar espelho de ponto' }, { status: 500 });
  }
}
