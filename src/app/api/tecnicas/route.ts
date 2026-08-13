import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '@/lib/constants';
import {
  validateCreateTechnique,
  calculateTechniquesTotal,
} from '@/lib/technique-validator';
import { EventTechniqueServiceWithDetails } from '@/types';

interface GlobalTechniquesStore {
  memoryTechniques?: EventTechniqueServiceWithDetails[];
}

const globalStore = globalThis as unknown as GlobalTechniquesStore;

if (!globalStore.memoryTechniques) {
  globalStore.memoryTechniques = [];
}

const memoryTechniques = globalStore.memoryTechniques;

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const userIdParam = searchParams.get('userId');

    // Prevenção de IDOR: apenas ADMIN pode consultar outros usuários ou all=true (INV-04)
    const isAdmin = payload.role === 'ADMIN';
    const targetUserId = isAdmin ? (all ? null : (userIdParam || null)) : payload.userId;

    try {
      let sql = `SELECT t.id, t.user_id as "userId", t.event_name as "eventName", 
                        TO_CHAR(t.service_date, 'YYYY-MM-DD') as "serviceDate", t.techniques_count as "techniquesCount", 
                        t.amount_per_technique_centavos as "amountPerTechniqueCentavos", 
                        t.total_amount_centavos as "totalAmountCentavos", t.notes, t.created_at as "createdAt",
                        u.name as "employeeName", u.cpf as "employeeCpf"
                 FROM event_technique_services t
                 JOIN users u ON u.id = t.user_id`;
      const params: string[] = [];

      if (targetUserId) {
        sql += ` WHERE t.user_id = $1`;
        params.push(targetUserId);
      }

      sql += ` ORDER BY t.service_date DESC`;
      const rows = await query<EventTechniqueServiceWithDetails>(sql, params);
      return NextResponse.json({ success: true, services: rows || [] });
    } catch {
      let result = [...memoryTechniques];
      if (targetUserId) {
        result = result.filter((item) => item.userId === targetUserId);
      }
      return NextResponse.json({ success: true, services: result });
    }
  } catch (error: unknown) {
    console.error('[API Tecnicas GET Error]:', error);
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

    const count = typeof techniquesCount === 'number' ? techniquesCount : 1;
    const validation = validateCreateTechnique({
      eventName,
      serviceDate,
      techniquesCount: count,
      notes,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cleanServiceDate = validation.normalizedDate || serviceDate.trim().substring(0, 10);
    const amountPerTechnique = TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS; // R$ 150,00
    const totalAmount = calculateTechniquesTotal(count, amountPerTechnique);
    const serviceId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const record: EventTechniqueServiceWithDetails = {
      id: serviceId,
      userId: payload.userId,
      employeeName: payload.name,
      employeeCpf: payload.cpf,
      eventName,
      serviceDate: cleanServiceDate,
      techniquesCount: count,
      amountPerTechniqueCentavos: amountPerTechnique,
      totalAmountCentavos: totalAmount,
      notes: notes || null,
      createdAt,
    };

    try {
      await query(
        `INSERT INTO event_technique_services 
           (id, user_id, event_name, service_date, techniques_count, amount_per_technique_centavos, total_amount_centavos, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [serviceId, payload.userId, eventName, cleanServiceDate, count, amountPerTechnique, totalAmount, notes || null, createdAt]
      );
    } catch {
      memoryTechniques.unshift(record);
      globalStore.memoryTechniques = memoryTechniques;
    }

    return NextResponse.json({
      success: true,
      service: record,
    });
  } catch (error: unknown) {
    console.error('[API Tecnicas POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar técnica de evento' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Autorização necessária (Apenas Administrador)' }, { status: 403 });
    }

    const body = await request.json();
    const { serviceId, techniquesCount, notes } = body as {
      serviceId: string;
      techniquesCount?: number;
      notes?: string;
    };

    if (!serviceId) {
      return NextResponse.json({ error: 'ID do registro é obrigatório' }, { status: 400 });
    }

    if (typeof techniquesCount === 'number' && techniquesCount < 1) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    const count = typeof techniquesCount === 'number' ? techniquesCount : 1;
    const totalAmount = calculateTechniquesTotal(count, TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS);

    try {
      await query(
        `UPDATE event_technique_services 
         SET techniques_count = $1, total_amount_centavos = $2, notes = COALESCE($3, notes)
         WHERE id = $4`,
        [count, totalAmount, notes || null, serviceId]
      );
    } catch {
      // Fallback
    }

    const found = memoryTechniques.find((s) => s.id === serviceId);
    if (found) {
      found.techniquesCount = count;
      found.totalAmountCentavos = totalAmount;
      if (notes) found.notes = notes;
    }
    globalStore.memoryTechniques = memoryTechniques;

    return NextResponse.json({
      success: true,
      serviceId,
      techniquesCount: count,
      totalAmountCentavos: totalAmount,
    });
  } catch (error: unknown) {
    console.error('[API Tecnicas PATCH Error]:', error);
    return NextResponse.json({ error: 'Erro ao ajustar técnica' }, { status: 500 });
  }
}
