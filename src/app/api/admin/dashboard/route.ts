import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
    }

    let activeWorkers = await query(
      `SELECT DISTINCT ON (user_id) t.*, u.name as employee_name, u.phone
       FROM time_entries t
       JOIN users u ON u.id = t.user_id
       ORDER BY user_id, t.timestamp DESC`
    );
    activeWorkers = activeWorkers.filter((w) => w.entry_type === 'CLOCK_IN');

    const vehiclesOnRoad = await query(
      `SELECT u.*, v.name as vehicle_name, v.plate, usr.name as driver_name 
       FROM vehicle_usages u
       JOIN vehicles v ON v.id = u.vehicle_id
       JOIN users usr ON usr.id = u.user_id
       WHERE u.status = 'IN_USE'`
    );

    const audioDiariesFeed = await query(
      `SELECT a.*, t.timestamp, t.user_id, u.name as employee_name
       FROM audio_diaries a
       JOIN time_entries t ON t.id = a.time_entry_id
       JOIN users u ON u.id = t.user_id
       ORDER BY a.created_at DESC LIMIT 20`
    );

    const vehicleAlerts = await query(
      `SELECT n.*, v.name as vehicle_name, v.plate, u.name as reported_by
       FROM vehicle_notes n
       JOIN vehicles v ON v.id = n.vehicle_id
       JOIN users u ON u.id = n.user_id
       WHERE n.is_resolved = FALSE
       ORDER BY n.created_at DESC`
    );

    const anomalyRows = await query(
      `SELECT t.*, u.name as employee_name
       FROM time_entries t
       JOIN users u ON u.id = t.user_id
       WHERE t.is_outside_hq = TRUE OR t.gps_status = 'UNAVAILABLE'
       ORDER BY t.timestamp DESC LIMIT 20`
    );

    const anomalyAlerts = anomalyRows.map((e: any) => ({
      id: e.id,
      type: e.is_outside_hq ? 'OUTSIDE_HQ' : 'NO_GPS',
      employeeName: e.employee_name,
      timestamp: e.timestamp,
      message: e.is_outside_hq
        ? 'Entrada registrada fora do raio permitido da sede.'
        : 'Ponto batido sem coordenadas de GPS.',
    }));

    return NextResponse.json({
      success: true,
      stats: {
        activeWorkersCount: activeWorkers.length,
        vehiclesOnRoadCount: vehiclesOnRoad.length,
        pendingMaintenanceAlertsCount: vehicleAlerts.length,
        anomaliesCount: anomalyAlerts.length,
      },
      activeWorkers,
      vehiclesOnRoad,
      audioDiariesFeed,
      vehicleAlerts,
      anomalyAlerts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard admin' }, { status: 500 });
  }
}
