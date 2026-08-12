import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { VehicleStatus } from '@/types';

// In-memory fallback
let memoryVehicles = [
  { id: 'v1', name: 'Fiorino 01', plate: 'ABC-1234', status: 'GARAGE' as VehicleStatus },
  { id: 'v2', name: 'Kango 02', plate: 'XYZ-5678', status: 'GARAGE' as VehicleStatus },
  { id: 'v3', name: 'Master Caminhão 03', plate: 'EVE-9999', status: 'GARAGE' as VehicleStatus },
];
let memoryUsages: any[] = [];

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const vehicles = await query('SELECT * FROM vehicles ORDER BY name ASC');
      const activeUsages = await query(
        `SELECT u.*, v.name as vehicle_name, v.plate, usr.name as driver_name 
         FROM vehicle_usages u
         JOIN vehicles v ON v.id = u.vehicle_id
         JOIN users usr ON usr.id = u.user_id
         WHERE u.status = 'IN_USE'`
      );
      return NextResponse.json({ success: true, vehicles, activeUsages });
    } catch (dbErr) {
      return NextResponse.json({ success: true, vehicles: memoryVehicles, activeUsages: memoryUsages });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados da frota' }, { status: 500 });
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
    const { vehicleId, action } = body as { vehicleId: string; action: 'PICKUP' | 'RETURN' };

    if (!vehicleId || !action) {
      return NextResponse.json({ error: 'Veículo e ação são obrigatórios' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    if (action === 'PICKUP') {
      try {
        await query("UPDATE vehicles SET status = 'ON_ROAD' WHERE id = $1", [vehicleId]);
        await query(
          "INSERT INTO vehicle_usages (id, vehicle_id, user_id, picked_up_at, status) VALUES ($1, $2, $3, $4, 'IN_USE')",
          [crypto.randomUUID(), vehicleId, payload.userId, timestamp]
        );
      } catch (dbErr) {
        const v = memoryVehicles.find((item) => item.id === vehicleId);
        if (v) v.status = 'ON_ROAD';
        memoryUsages.push({
          id: crypto.randomUUID(),
          vehicle_id: vehicleId,
          user_id: payload.userId,
          driver_name: payload.name,
          status: 'IN_USE',
          picked_up_at: timestamp,
        });
      }
    } else if (action === 'RETURN') {
      // INV-03: Devolução transita status do veículo para GARAGE
      try {
        await query("UPDATE vehicles SET status = 'GARAGE' WHERE id = $1", [vehicleId]);
        await query(
          "UPDATE vehicle_usages SET returned_at = $1, status = 'RETURNED' WHERE vehicle_id = $2 AND status = 'IN_USE'",
          [timestamp, vehicleId]
        );
      } catch (dbErr) {
        const v = memoryVehicles.find((item) => item.id === vehicleId);
        if (v) v.status = 'GARAGE';
        memoryUsages = memoryUsages.filter((u) => u.vehicle_id !== vehicleId);
      }
    }

    return NextResponse.json({ success: true, vehicleId, action });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao registrar operação de frota' }, { status: 500 });
  }
}
