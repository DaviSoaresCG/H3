import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import {
  validateCreateVehicleNote,
  validateResolveVehicleNote,
} from '@/lib/maintenance-validator';
import { VehicleNoteWithDetails, VehicleNoteCategory } from '@/types';

interface GlobalNotesStore {
  memoryNotes?: VehicleNoteWithDetails[];
}

const globalStore = globalThis as unknown as GlobalNotesStore;

if (!globalStore.memoryNotes) {
  globalStore.memoryNotes = [];
}

const memoryNotes = globalStore.memoryNotes;

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
    const status = searchParams.get('status'); // 'PENDING' | 'RESOLVED' | 'ALL'

    try {
      let sql = `SELECT n.id, n.vehicle_id as "vehicleId", n.user_id as "userId", n.category, 
                        n.note_text as "noteText", n.is_resolved as "isResolved", 
                        n.resolved_by as "resolvedBy", n.created_at as "createdAt",
                        v.name as "vehicleName", v.plate, u.name as "reportedBy",
                        res.name as "resolvedByName"
                 FROM vehicle_notes n
                 JOIN vehicles v ON v.id = n.vehicle_id
                 JOIN users u ON u.id = n.user_id
                 LEFT JOIN users res ON res.id = n.resolved_by
                 WHERE 1=1`;
      const params: (string | boolean)[] = [];

      if (vehicleId) {
        params.push(vehicleId);
        sql += ` AND n.vehicle_id = $${params.length}`;
      }

      if (status === 'PENDING') {
        sql += ` AND n.is_resolved = FALSE`;
      } else if (status === 'RESOLVED') {
        sql += ` AND n.is_resolved = TRUE`;
      }

      sql += ` ORDER BY n.created_at DESC`;
      const notes = await query<VehicleNoteWithDetails>(sql, params);
      return NextResponse.json({ success: true, notes: notes || [] });
    } catch {
      let filtered = [...memoryNotes];
      if (vehicleId) {
        filtered = filtered.filter((n) => n.vehicleId === vehicleId);
      }
      if (status === 'PENDING') {
        filtered = filtered.filter((n) => !n.isResolved);
      } else if (status === 'RESOLVED') {
        filtered = filtered.filter((n) => n.isResolved);
      }
      return NextResponse.json({ success: true, notes: filtered });
    }
  } catch (error: unknown) {
    console.error('[API Frota Notes GET Error]:', error);
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

    const validation = validateCreateVehicleNote({ vehicleId, category, noteText });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const noteId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let vehicleName = 'Veículo';
    let plate = '---';
    try {
      const v = await queryOne<{ name: string; plate: string }>(
        'SELECT name, plate FROM vehicles WHERE id = $1',
        [vehicleId]
      );
      if (v) {
        vehicleName = v.name;
        plate = v.plate;
      }
    } catch {
      // Ignora erro
    }

    try {
      await query(
        `INSERT INTO vehicle_notes (id, vehicle_id, user_id, category, note_text, is_resolved, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
        [noteId, vehicleId, payload.userId, category, noteText, timestamp]
      );
    } catch {
      memoryNotes.unshift({
        id: noteId,
        vehicleId,
        userId: payload.userId,
        reportedBy: payload.name,
        vehicleName,
        plate,
        category,
        noteText,
        isResolved: false,
        createdAt: timestamp,
      });
      globalStore.memoryNotes = memoryNotes;
    }

    return NextResponse.json({
      success: true,
      note: {
        id: noteId,
        vehicleId,
        userId: payload.userId,
        reportedBy: payload.name,
        vehicleName,
        plate,
        category,
        noteText,
        isResolved: false,
        createdAt: timestamp,
      },
    });
  } catch (error: unknown) {
    console.error('[API Frota Notes POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar observação do veículo' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { noteId } = body as { noteId: string };

    const validation = validateResolveVehicleNote({
      userRole: payload.role,
      noteId,
    });

    if (!validation.allowed) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const timestamp = new Date().toISOString();

    try {
      await query(
        `UPDATE vehicle_notes 
         SET is_resolved = TRUE, resolved_by = $1
         WHERE id = $2`,
        [payload.userId, noteId]
      );
    } catch {
      const note = memoryNotes.find((n) => n.id === noteId);
      if (note) {
        note.isResolved = true;
        note.resolvedBy = payload.userId;
        note.resolvedByName = payload.name;
      }
      globalStore.memoryNotes = memoryNotes;
    }

    return NextResponse.json({ success: true, noteId, isResolved: true, resolvedByName: payload.name });
  } catch (error: unknown) {
    console.error('[API Frota Notes PATCH Error]:', error);
    return NextResponse.json({ error: 'Erro ao dar baixa na observação' }, { status: 500 });
  }
}
