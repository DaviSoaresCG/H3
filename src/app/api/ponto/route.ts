import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { DEFAULT_HQ_RADIUS_METERS } from '@/lib/constants';
import {
  validateTimeEntryTransition,
  validateClockOutRequirements,
  calculateIsOutsideHq,
} from '@/lib/ponto-validator';
import { TimeEntryType, GpsStatus, StoredTimeEntry } from '@/types';

interface GlobalWithMemory {
  memoryTimeEntries?: StoredTimeEntry[];
}

const globalStore = globalThis as unknown as GlobalWithMemory;
if (!globalStore.memoryTimeEntries) {
  globalStore.memoryTimeEntries = [];
}
const memoryTimeEntries: StoredTimeEntry[] = globalStore.memoryTimeEntries;

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
      const rows = await query<StoredTimeEntry>(
        `SELECT t.*, a.transcription_text, a.audio_url, a.is_fallback_text 
         FROM time_entries t
         LEFT JOIN audio_diaries a ON a.time_entry_id = t.id
         WHERE t.user_id = $1
         ORDER BY t.timestamp DESC LIMIT 50`,
        [userId]
      );
      if (rows && rows.length > 0) {
        return NextResponse.json({ success: true, timeEntries: rows });
      }
    } catch {
      // Fallback em memória
    }

    const userEntries = memoryTimeEntries.filter((e) => e.user_id === userId);
    return NextResponse.json({ success: true, timeEntries: userEntries });
  } catch (error: unknown) {
    console.error('[API Ponto GET Error]:', error);
    return NextResponse.json({ error: 'Erro ao buscar registros de ponto' }, { status: 500 });
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
    const {
      entryType,
      latitude,
      longitude,
      gpsStatus,
      audioUrl,
      transcriptionText,
      isFallbackText,
      fallbackReason,
      durationSeconds,
    } = body as {
      entryType: TimeEntryType;
      latitude?: number;
      longitude?: number;
      gpsStatus?: GpsStatus;
      audioUrl?: string;
      transcriptionText?: string;
      isFallbackText?: boolean;
      fallbackReason?: string;
      durationSeconds?: number;
    };

    if (!entryType) {
      return NextResponse.json({ error: 'Tipo de ponto é obrigatório' }, { status: 400 });
    }

    // 1. Busca a última batida de ponto do usuário para validar a transição
    let lastEntry: { entry_type: TimeEntryType } | null = null;
    try {
      lastEntry = await queryOne<{ entry_type: TimeEntryType }>(
        'SELECT entry_type FROM time_entries WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [payload.userId]
      );
    } catch {
      const memUserEntries = memoryTimeEntries.filter((e) => e.user_id === payload.userId);
      if (memUserEntries.length > 0) {
        lastEntry = { entry_type: memUserEntries[0].entry_type };
      }
    }

    // 2. Validação da transição de estado da jornada (INV-02)
    const transitionCheck = validateTimeEntryTransition(lastEntry?.entry_type, entryType);
    if (!transitionCheck.allowed) {
      return NextResponse.json({ error: transitionCheck.error }, { status: 400 });
    }

    // 3. Validação INV-01: CLOCK_OUT exige áudio ou relato de fallback em texto com justificativa
    if (entryType === 'CLOCK_OUT') {
      const clockOutCheck = validateClockOutRequirements({
        transcriptionText,
        audioUrl,
        isFallbackText,
        fallbackReason,
      });
      if (!clockOutCheck.valid) {
        return NextResponse.json({ error: clockOutCheck.error }, { status: 400 });
      }
    }

    // 4. Verificação de Viagem Ativa ESPECÍFICA para o usuário autenticado
    let isInActiveTrip = false;
    try {
      const activeTrip = await queryOne<{ id: string }>(
        `SELECT t.id FROM trips t 
         JOIN trip_participants tp ON tp.trip_id = t.id 
         WHERE tp.user_id = $1 AND t.start_date <= CURRENT_DATE AND t.end_date >= CURRENT_DATE 
         LIMIT 1`,
        [payload.userId]
      );
      if (activeTrip) {
        isInActiveTrip = true;
      }
    } catch {
      // Ignora erro de DB
    }

    let hqLat: number | null = null;
    let hqLon: number | null = null;
    let hqRadius = DEFAULT_HQ_RADIUS_METERS;

    try {
      const hqSettings = await queryOne<{ hq_latitude: number; hq_longitude: number; hq_radius_meters: number }>(
        'SELECT hq_latitude, hq_longitude, hq_radius_meters FROM company_settings LIMIT 1'
      );
      if (hqSettings && hqSettings.hq_latitude && hqSettings.hq_longitude) {
        hqLat = Number(hqSettings.hq_latitude);
        hqLon = Number(hqSettings.hq_longitude);
        hqRadius = hqSettings.hq_radius_meters || DEFAULT_HQ_RADIUS_METERS;
      }
    } catch {
      // Ignora erro
    }

    const isOutsideHq = calculateIsOutsideHq({
      userLat: latitude || null,
      userLon: longitude || null,
      hqLat,
      hqLon,
      hqRadiusMeters: hqRadius,
      isInActiveTrip,
    });

    const timestamp = new Date().toISOString();
    const entryId = crypto.randomUUID();

    const newEntry: StoredTimeEntry = {
      id: entryId,
      user_id: payload.userId,
      entry_type: entryType,
      timestamp,
      latitude: latitude || null,
      longitude: longitude || null,
      gps_status: gpsStatus || (latitude && longitude ? 'OK' : 'UNAVAILABLE'),
      is_outside_hq: isOutsideHq,
      transcription_text: transcriptionText || null,
      audio_url: audioUrl || null,
      is_fallback_text: isFallbackText || false,
    };

    // Salva na memória
    memoryTimeEntries.unshift(newEntry);

    // Persiste no banco PostgreSQL
    try {
      await query(
        `INSERT INTO time_entries (id, user_id, entry_type, timestamp, latitude, longitude, gps_status, is_outside_hq)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entryId,
          payload.userId,
          entryType,
          timestamp,
          latitude || null,
          longitude || null,
          newEntry.gps_status,
          isOutsideHq,
        ]
      );

      if (entryType === 'CLOCK_OUT' && (transcriptionText || audioUrl)) {
        const audioId = crypto.randomUUID();
        const duration = durationSeconds || 0;
        await query(
          `INSERT INTO audio_diaries (id, time_entry_id, audio_url, transcription_text, is_fallback_text, fallback_reason, duration_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            audioId,
            entryId,
            audioUrl || null,
            transcriptionText || 'Relato gravado.',
            isFallbackText || false,
            fallbackReason || null,
            duration,
          ]
        );
      }
    } catch (dbErr) {
      console.warn('[DB Warning]: Persistido em fallback de memória.', dbErr);
    }

    return NextResponse.json({
      success: true,
      timeEntry: {
        id: entryId,
        userId: payload.userId,
        entryType,
        timestamp,
        latitude,
        longitude,
        gpsStatus: newEntry.gps_status,
        isOutsideHq,
      },
    });
  } catch (error: unknown) {
    console.error('[API Ponto POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar ponto' }, { status: 500 });
  }
}
