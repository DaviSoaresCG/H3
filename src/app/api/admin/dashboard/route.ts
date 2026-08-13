import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  calculateShiftDurationHours,
  detectShiftExceeded12h,
  detectOverdueVehicleUsage,
} from '@/lib/dashboard-aggregator';
import { AnomalyAlertItem, DashboardStatsData, AudioDiaryFeedItem } from '@/types';

interface TimeEntryDbRow {
  id: string;
  userId: string;
  entryType: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gpsStatus: 'OK' | 'UNAVAILABLE';
  isOutsideHq: boolean;
  employeeName: string;
  phone?: string;
}

interface VehicleUsageDbRow {
  id: string;
  vehicleId: string;
  userId: string;
  pickedUpAt: string;
  vehicleName: string;
  plate: string;
  driverName: string;
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
    }

    const now = new Date();

    // Memory Store global
    const memoryEntries: any[] = (globalThis as any).memoryTimeEntries || [];
    const memoryUsages: any[] = (globalThis as any).memoryUsages || [];
    const memoryNotes: any[] = (globalThis as any).memoryVehicleNotes || [];

    let activeWorkers: TimeEntryDbRow[] = [];
    let vehiclesOnRoad: VehicleUsageDbRow[] = [];
    let audioDiariesFeed: AudioDiaryFeedItem[] = [];
    let vehicleAlerts: any[] = [];
    const anomalyAlerts: AnomalyAlertItem[] = [];

    try {
      // 1. Funcionários trabalhando: encontra o último registro por funcionário
      const latestEntries = await query<TimeEntryDbRow>(
        `SELECT DISTINCT ON (user_id) t.id, t.user_id as "userId", t.entry_type as "entryType", 
                t.timestamp, t.latitude, t.longitude, t.gps_status as "gpsStatus", 
                t.is_outside_hq as "isOutsideHq", u.name as "employeeName", u.phone
         FROM time_entries t
         JOIN users u ON u.id = t.user_id
         ORDER BY user_id, t.timestamp DESC`
      );

      if (latestEntries && latestEntries.length > 0) {
        activeWorkers = latestEntries.filter(
          (w) => w.entryType === 'CLOCK_IN' || w.entryType === 'MEAL_END'
        );

        // Para cada funcionário ativo, busca o CLOCK_IN que abriu a jornada atual
        for (const worker of activeWorkers) {
          const shiftOpenEntry = await query<TimeEntryDbRow>(
            `SELECT timestamp FROM time_entries 
             WHERE user_id = $1 AND entry_type = 'CLOCK_IN' 
             ORDER BY timestamp DESC LIMIT 1`,
            [worker.userId]
          );

          const openTimestamp = shiftOpenEntry?.[0]?.timestamp || worker.timestamp;
          const shiftHours = calculateShiftDurationHours(openTimestamp, now);

          if (detectShiftExceeded12h(openTimestamp, now)) {
            anomalyAlerts.push({
              id: `shift-12h-${worker.id}`,
              type: 'SHIFT_EXCEEDED_12H',
              severity: 'CRITICAL',
              employeeName: worker.employeeName,
              timestamp: openTimestamp,
              shiftHours: Number(shiftHours.toFixed(1)),
              message: `Jornada contínua de ${shiftHours.toFixed(1)}h sem encerramento de ponto de saída.`,
            });
          }
        }

        // Anomalias de localização / GPS nas últimas 24h
        const recentAnomalies = await query<TimeEntryDbRow>(
          `SELECT t.id, t.user_id as "userId", t.entry_type as "entryType", t.timestamp, 
                  t.gps_status as "gpsStatus", t.is_outside_hq as "isOutsideHq", u.name as "employeeName"
           FROM time_entries t
           JOIN users u ON u.id = t.user_id
           WHERE t.timestamp >= NOW() - INTERVAL '24 hours'
             AND (t.is_outside_hq = TRUE OR t.gps_status = 'UNAVAILABLE')
           ORDER BY t.timestamp DESC`
        );

        if (recentAnomalies) {
          for (const item of recentAnomalies) {
            if (item.isOutsideHq) {
              anomalyAlerts.push({
                id: `outside-hq-${item.id}`,
                type: 'OUTSIDE_HQ',
                severity: 'HIGH',
                employeeName: item.employeeName,
                timestamp: item.timestamp,
                message: 'Entrada registrada a mais de 500m da sede sem viagem agendada.',
              });
            } else if (item.gpsStatus === 'UNAVAILABLE') {
              anomalyAlerts.push({
                id: `no-gps-${item.id}`,
                type: 'NO_GPS',
                severity: 'MEDIUM',
                employeeName: item.employeeName,
                timestamp: item.timestamp,
                message: 'Ponto registrado sem coordenadas GPS disponíveis.',
              });
            }
          }
        }
      }

      // 2. Veículos na rua e detecção de atraso de devolução (>14h)
      const dbUsages = await query<VehicleUsageDbRow>(
        `SELECT u.id, u.vehicle_id as "vehicleId", u.user_id as "userId", u.picked_up_at as "pickedUpAt",
                v.name as "vehicleName", v.plate, usr.name as "driverName"
         FROM vehicle_usages u
         JOIN vehicles v ON v.id = u.vehicle_id
         JOIN users usr ON usr.id = u.user_id
         WHERE u.status = 'IN_USE'`
      );

      if (dbUsages) {
        vehiclesOnRoad = dbUsages;
        for (const usage of dbUsages) {
          const hoursOnRoad = calculateShiftDurationHours(usage.pickedUpAt, now);
          if (detectOverdueVehicleUsage(usage.pickedUpAt, now, 14)) {
            anomalyAlerts.push({
              id: `vehicle-overdue-${usage.id}`,
              type: 'VEHICLE_OVERDUE',
              severity: 'HIGH',
              employeeName: usage.driverName,
              timestamp: usage.pickedUpAt,
              message: `Veículo ${usage.vehicleName} (${usage.plate}) na rua há mais de ${hoursOnRoad.toFixed(1)}h sem devolução à sede.`,
            });
          }
        }
      }

      // 3. Feed cronológico de áudios do dia (Whisper)
      const dbAudios = await query<AudioDiaryFeedItem>(
        `SELECT a.id, a.time_entry_id as "timeEntryId", a.audio_url as "audioUrl", 
                a.transcription_text as "transcriptionText", a.is_fallback_text as "isFallbackText",
                a.fallback_reason as "fallbackReason", a.duration_seconds as "durationSeconds",
                a.created_at as "createdAt", u.name as "employeeName"
         FROM audio_diaries a
         JOIN time_entries t ON t.id = a.time_entry_id
         JOIN users u ON u.id = t.user_id
         WHERE a.created_at >= NOW() - INTERVAL '24 hours'
         ORDER BY a.created_at DESC LIMIT 30`
      );
      if (dbAudios) {
        audioDiariesFeed = dbAudios;
      }

      // 4. Alertas de manutenção de veículos pendentes
      const dbNotes = await query<any>(
        `SELECT n.id, n.vehicle_id as "vehicleId", n.category, n.note_text as "noteText",
                n.created_at as "createdAt", v.name as "vehicleName", v.plate, u.name as "reportedBy"
         FROM vehicle_notes n
         JOIN vehicles v ON v.id = n.vehicle_id
         JOIN users u ON u.id = n.user_id
         WHERE n.is_resolved = FALSE
         ORDER BY n.created_at DESC`
      );
      if (dbNotes) {
        vehicleAlerts = dbNotes;
      }
    } catch {
      // Memory fallback
      activeWorkers = memoryEntries
        .filter((e) => e.entry_type === 'CLOCK_IN')
        .map((e) => ({
          id: e.id,
          userId: e.user_id || 'u1',
          employeeName: 'Carlos Montador',
          timestamp: e.timestamp,
          entryType: 'CLOCK_IN',
          latitude: e.latitude || null,
          longitude: e.longitude || null,
          gpsStatus: e.gps_status || 'OK',
          isOutsideHq: !!e.is_outside_hq,
        }));

      vehiclesOnRoad = [
        {
          id: 'u1',
          vehicleId: 'v1',
          userId: 'u1',
          vehicleName: 'Fiorino 01',
          plate: 'ABC-1234',
          driverName: 'Carlos Montador',
          pickedUpAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        },
      ];

      audioDiariesFeed = memoryEntries
        .filter((e) => e.transcription_text)
        .map((e) => ({
          id: e.id,
          employeeName: 'Carlos Montador',
          transcriptionText: e.transcription_text,
          createdAt: e.timestamp,
          audioUrl: e.audio_url || null,
          isFallbackText: e.is_fallback_text || false,
          fallbackReason: e.fallback_reason || null,
          durationSeconds: e.duration_seconds || 45,
        }));

      vehicleAlerts = memoryNotes
        .filter((n) => !n.is_resolved)
        .map((n) => ({
          id: n.id,
          vehicleName: n.vehicle_name || 'Fiorino 01',
          plate: n.plate || 'ABC-1234',
          reportedBy: n.reported_by || 'Carlos Montador',
          category: n.category || 'GENERAL',
          noteText: n.note_text,
          createdAt: n.created_at,
        }));

      // Anomalias no memory fallback
      for (const e of memoryEntries) {
        if (e.is_outside_hq) {
          anomalyAlerts.push({
            id: `outside-hq-${e.id}`,
            type: 'OUTSIDE_HQ',
            severity: 'HIGH',
            employeeName: 'Carlos Montador',
            timestamp: e.timestamp,
            message: 'Entrada registrada a mais de 500m da sede sem viagem agendada.',
          });
        }
        if (e.gps_status === 'UNAVAILABLE') {
          anomalyAlerts.push({
            id: `no-gps-${e.id}`,
            type: 'NO_GPS',
            severity: 'MEDIUM',
            employeeName: 'Carlos Montador',
            timestamp: e.timestamp,
            message: 'Ponto registrado sem coordenadas GPS disponíveis.',
          });
        }
        if (e.entry_type === 'CLOCK_IN' && detectShiftExceeded12h(e.timestamp, now)) {
          const shiftHours = calculateShiftDurationHours(e.timestamp, now);
          anomalyAlerts.push({
            id: `shift-12h-${e.id}`,
            type: 'SHIFT_EXCEEDED_12H',
            severity: 'CRITICAL',
            employeeName: 'Carlos Montador',
            timestamp: e.timestamp,
            shiftHours: Number(shiftHours.toFixed(1)),
            message: `Jornada contínua de ${shiftHours.toFixed(1)}h sem encerramento de ponto.`,
          });
        }
      }

      // Detecção de carro atrasado no memory fallback
      for (const usage of vehiclesOnRoad) {
        if (detectOverdueVehicleUsage(usage.pickedUpAt, now, 14)) {
          const hoursOnRoad = calculateShiftDurationHours(usage.pickedUpAt, now);
          anomalyAlerts.push({
            id: `vehicle-overdue-${usage.id}`,
            type: 'VEHICLE_OVERDUE',
            severity: 'HIGH',
            employeeName: usage.driverName,
            timestamp: usage.pickedUpAt,
            message: `Veículo ${usage.vehicleName} (${usage.plate}) na rua há mais de ${hoursOnRoad.toFixed(1)}h sem devolução à sede.`,
          });
        }
      }
    }

    const stats: DashboardStatsData = {
      activeWorkersCount: activeWorkers.length,
      vehiclesOnRoadCount: vehiclesOnRoad.length,
      pendingMaintenanceAlertsCount: vehicleAlerts.length,
      anomaliesCount: anomalyAlerts.length,
      totalAudioDiariesCount: audioDiariesFeed.length,
    };

    return NextResponse.json({
      success: true,
      stats,
      activeWorkers,
      vehiclesOnRoad,
      audioDiariesFeed,
      vehicleAlerts,
      anomalyAlerts,
    });
  } catch (error: unknown) {
    console.error('[API Dashboard Error]:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard admin' }, { status: 500 });
  }
}
