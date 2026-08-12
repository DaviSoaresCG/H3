import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { isOutsideRadius } from '@/lib/geofence';
import { DEFAULT_HQ_RADIUS_METERS } from '@/lib/constants';
import { TimeEntryType, GpsStatus } from '@/types';

// In-memory global store para dev (preserva entre hot-reloads)
if (!(globalThis as any).memoryTimeEntries) {
  (globalThis as any).memoryTimeEntries = [];
}
if (!(globalThis as any).memoryAudioDiaries) {
  (globalThis as any).memoryAudioDiaries = [];
}

const memoryTimeEntries: any[] = (globalThis as any).memoryTimeEntries;
const memoryAudioDiaries: any[] = (globalThis as any).memoryAudioDiaries;

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
    } catch (dbErr) {
      // Ignora erro de DB
    }

    // Memory fallback
    const userEntries = memoryTimeEntries.filter((e) => e.user_id === userId);
    return NextResponse.json({ success: true, timeEntries: userEntries });
  } catch (error: any) {
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
    } = body as {
      entryType: TimeEntryType;
      latitude?: number;
      longitude?: number;
      gpsStatus?: GpsStatus;
      audioUrl?: string;
      transcriptionText?: string;
      isFallbackText?: boolean;
      fallbackReason?: string;
    };

    if (!entryType) {
      return NextResponse.json({ error: 'Tipo de ponto é obrigatório' }, { status: 400 });
    }

    // INV-01: CLOCK_OUT exige áudio ou relato de fallback em texto
    if (entryType === 'CLOCK_OUT' && !transcriptionText && !audioUrl) {
      return NextResponse.json(
        { error: 'INV-01: O ponto de saída exige gravação de relato em áudio ou texto de fallback' },
        { status: 400 }
      );
    }

    let isOutsideHq = false;
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
    } catch (e) {
      // Ignora erro
    }

    if (entryType === 'CLOCK_IN' && latitude && longitude && hqLat && hqLon) {
      isOutsideHq = isOutsideRadius(latitude, longitude, hqLat, hqLon, hqRadius);
    }

    const timestamp = new Date().toISOString();
    const entryId = crypto.randomUUID();

    const newEntry = {
      id: entryId,
      user_id: payload.userId,
      entry_type: entryType,
      timestamp,
      latitude: latitude || null,
      longitude: longitude || null,
      gps_status: gpsStatus || 'OK',
      is_outside_hq: isOutsideHq,
      transcription_text: transcriptionText || null,
      audio_url: audioUrl || null,
      is_fallback_text: isFallbackText || false,
    };

    // Salva sempre no repositório em memória
    memoryTimeEntries.unshift(newEntry);

    // Tenta salvar no PostgreSQL
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
          gpsStatus || 'OK',
          isOutsideHq,
        ]
      );

      if (entryType === 'CLOCK_OUT' && transcriptionText) {
        const audioId = crypto.randomUUID();
        await query(
          `INSERT INTO audio_diaries (id, time_entry_id, audio_url, transcription_text, is_fallback_text, fallback_reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            audioId,
            entryId,
            audioUrl || null,
            transcriptionText,
            isFallbackText || false,
            fallbackReason || null,
          ]
        );
      }
    } catch (dbErr) {
      // Já salvo em memória
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
        gpsStatus: gpsStatus || 'OK',
        isOutsideHq,
      },
    });
  } catch (error: any) {
    console.error('[API Ponto Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar ponto' }, { status: 500 });
  }
}
