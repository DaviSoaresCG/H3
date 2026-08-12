import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { VehicleNoteCategory } from '@/types';

// In-memory fallback
const memoryNotes: any[] = [];

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    try {
      let sql = `SELECT n.*, v.name as vehicle_name, v.plate, u.name as reported_by 
                 FROM vehicle_notes n
                 JOIN vehicles v ON v.id = n.vehicle_id
                 JOIN users u ON u.id = n.user_id`;
      const params: any[] = [];

      if (vehicleId) {
        sql += ` WHERE n.vehicle_id = $1`;
        params.push(vehicleId);
      }

      sql += ` ORDER BY n.created_at DESC`;
      const notes = await query(sql, params);
      return NextResponse.json({ success: true, notes });
    } catch (dbErr) {
      return NextResponse.json({ success: true, notes: memoryNotes });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar observações do veículo' }, { status: 500 });
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
    const { vehicleId, category, noteText } = body as {
      vehicleId: string;
      category: VehicleNoteCategory;
      noteText: string;
    };

    if (!vehicleId || !category || !noteText) {
      return NextResponse.json({ error: 'Veículo, categoria e texto são obrigatórios' }, { status: 400 });
    }

    const noteId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      await query(
        `INSERT INTO vehicle_notes (id, vehicle_id, user_id, category, note_text, is_resolved, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
        [noteId, vehicleId, payload.userId, category, noteText, timestamp]
      );
    } catch (dbErr) {
      memoryNotes.unshift({
        id: noteId,
        vehicle_id: vehicleId,
        user_id: payload.userId,
        reported_by: payload.name,
        category,
        note_text: noteText,
        is_resolved: false,
        created_at: timestamp,
      });
    }

    return NextResponse.json({
      success: true,
      note: { id: noteId, vehicleId, userId: payload.userId, category, noteText, isResolved: false },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao registrar observação do veículo' }, { status: 500 });
  }
}
