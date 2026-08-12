import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '@/lib/constants';

// In-memory fallback
const memoryTechniques: any[] = [];

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

    try {
      const rows = await query(
        `SELECT t.*, u.name as employee_name 
         FROM event_technique_services t
         JOIN users u ON u.id = t.user_id
         WHERE t.user_id = $1
         ORDER BY t.service_date DESC`,
        [userId]
      );
      return NextResponse.json({ success: true, services: rows });
    } catch (dbErr) {
      const userServices = memoryTechniques.filter((item) => item.user_id === userId);
      return NextResponse.json({ success: true, services: userServices });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar registros de técnicas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { eventName, serviceDate, techniquesCount, notes } = body as {
      eventName: string;
      serviceDate: string;
      techniquesCount?: number;
      notes?: string;
    };

    if (!eventName || !serviceDate) {
      return NextResponse.json({ error: 'Nome do evento e data do serviço são obrigatórios' }, { status: 400 });
    }

    const count = techniquesCount && techniquesCount > 0 ? techniquesCount : 1;
    const amountPerTechnique = TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS; // R$ 150,00 = 15000 centavos
    const totalAmount = count * amountPerTechnique;
    const serviceId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      await query(
        `INSERT INTO event_technique_services 
           (id, user_id, event_name, service_date, techniques_count, amount_per_technique_centavos, total_amount_centavos, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [serviceId, payload.userId, eventName, serviceDate, count, amountPerTechnique, totalAmount, notes || null, createdAt]
      );
    } catch (dbErr) {
      memoryTechniques.unshift({
        id: serviceId,
        user_id: payload.userId,
        employee_name: payload.name,
        event_name: eventName,
        service_date: serviceDate,
        techniques_count: count,
        amount_per_technique_centavos: amountPerTechnique,
        total_amount_centavos: totalAmount,
        notes: notes || null,
        created_at: createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      service: {
        id: serviceId,
        userId: payload.userId,
        eventName,
        serviceDate,
        techniquesCount: count,
        amountPerTechniqueCentavos: amountPerTechnique,
        totalAmountCentavos: totalAmount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao registrar técnica de evento' }, { status: 500 });
  }
}
