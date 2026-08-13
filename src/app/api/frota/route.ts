import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import {
  validateVehiclePickup,
  validateVehicleReturn,
  getVehicleStatusAfterReturn,
} from '@/lib/fleet-validator';
import { Vehicle, VehicleUsage, VehicleUsageWithDetails } from '@/types';

interface GlobalFleetStore {
  memoryVehicles?: Vehicle[];
  memoryUsages?: VehicleUsageWithDetails[];
}

const globalStore = globalThis as unknown as GlobalFleetStore;

if (!globalStore.memoryVehicles) {
  globalStore.memoryVehicles = [
    { id: 'v1', name: 'Fiorino 01', plate: 'ABC-1234', status: 'GARAGE', createdAt: new Date().toISOString() },
    { id: 'v2', name: 'Kangoo 02', plate: 'XYZ-5678', status: 'GARAGE', createdAt: new Date().toISOString() },
    { id: 'v3', name: 'Master Caminhão 03', plate: 'EVE-9999', status: 'GARAGE', createdAt: new Date().toISOString() },
  ];
}

if (!globalStore.memoryUsages) {
  globalStore.memoryUsages = [];
}

const memoryVehicles = globalStore.memoryVehicles;
let memoryUsages = globalStore.memoryUsages;

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const vehicles = await query<Vehicle>(
        'SELECT id, name, plate, status, created_at as "createdAt" FROM vehicles ORDER BY name ASC'
      );
      const activeUsages = await query<VehicleUsageWithDetails>(
        `SELECT u.id, u.vehicle_id as "vehicleId", u.user_id as "userId", u.picked_up_at as "pickedUpAt", 
                u.returned_at as "returnedAt", u.status, u.created_at as "createdAt",
                v.name as "vehicleName", v.plate, usr.name as "driverName" 
         FROM vehicle_usages u
         JOIN vehicles v ON v.id = u.vehicle_id
         JOIN users usr ON usr.id = u.user_id
         WHERE u.status = 'IN_USE'
         ORDER BY u.picked_up_at DESC`
      );
      const usageHistory = await query<VehicleUsageWithDetails>(
        `SELECT u.id, u.vehicle_id as "vehicleId", u.user_id as "userId", u.picked_up_at as "pickedUpAt", 
                u.returned_at as "returnedAt", u.status, u.created_at as "createdAt",
                v.name as "vehicleName", v.plate, usr.name as "driverName" 
         FROM vehicle_usages u
         JOIN vehicles v ON v.id = u.vehicle_id
         JOIN users usr ON usr.id = u.user_id
         WHERE u.status = 'RETURNED'
         ORDER BY u.returned_at DESC LIMIT 20`
      );

      if (vehicles && vehicles.length > 0) {
        return NextResponse.json({ success: true, vehicles, activeUsages, usageHistory });
      }
    } catch {
      // Fallback em memória
    }

    const activeList = memoryUsages.filter((u) => u.status === 'IN_USE');
    const historyList = memoryUsages.filter((u) => u.status === 'RETURNED');

    return NextResponse.json({
      success: true,
      vehicles: memoryVehicles,
      activeUsages: activeList,
      usageHistory: historyList,
    });
  } catch (error: unknown) {
    console.error('[API Frota GET Error]:', error);
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

    // 1. Busca veículo e uso ativo correspondente
    let vehicle: Vehicle | null = null;
    let activeUsage: VehicleUsageWithDetails | null = null;

    try {
      vehicle = await queryOne<Vehicle>(
        'SELECT id, name, plate, status, created_at as "createdAt" FROM vehicles WHERE id = $1',
        [vehicleId]
      );
      activeUsage = await queryOne<VehicleUsageWithDetails>(
        `SELECT id, vehicle_id as "vehicleId", user_id as "userId", picked_up_at as "pickedUpAt", 
                returned_at as "returnedAt", status, created_at as "createdAt"
         FROM vehicle_usages WHERE vehicle_id = $1 AND status = 'IN_USE' ORDER BY picked_up_at DESC LIMIT 1`,
        [vehicleId]
      );
    } catch {
      vehicle = memoryVehicles.find((v) => v.id === vehicleId) || null;
      activeUsage = memoryUsages.find((u) => u.vehicleId === vehicleId && u.status === 'IN_USE') || null;
    }

    if (!vehicle) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const isAdmin = payload.role === 'ADMIN';

    if (action === 'PICKUP') {
      const activeList = activeUsage ? [activeUsage] : [];
      const pickupValidation = validateVehiclePickup(vehicle, activeList);
      if (!pickupValidation.allowed) {
        return NextResponse.json({ error: pickupValidation.error }, { status: 400 });
      }

      const usageId = crypto.randomUUID();
      try {
        await query("UPDATE vehicles SET status = 'ON_ROAD' WHERE id = $1", [vehicleId]);
        await query(
          "INSERT INTO vehicle_usages (id, vehicle_id, user_id, picked_up_at, status) VALUES ($1, $2, $3, $4, 'IN_USE')",
          [usageId, vehicleId, payload.userId, timestamp]
        );
      } catch {
        vehicle.status = 'ON_ROAD';
        memoryUsages.unshift({
          id: usageId,
          vehicleId: vehicleId,
          userId: payload.userId,
          driverName: payload.name,
          vehicleName: vehicle.name,
          plate: vehicle.plate,
          status: 'IN_USE',
          pickedUpAt: timestamp,
          createdAt: timestamp,
        });
        globalStore.memoryUsages = memoryUsages;
      }
    } else if (action === 'RETURN') {
      const returnValidation = validateVehicleReturn({
        vehicle,
        activeUsage: activeUsage || null,
        requestingUserId: payload.userId,
        isAdmin,
      });
      if (!returnValidation.allowed) {
        return NextResponse.json({ error: returnValidation.error }, { status: 400 });
      }

      const newStatus = getVehicleStatusAfterReturn();
      try {
        await query("UPDATE vehicles SET status = $1 WHERE id = $2", [newStatus, vehicleId]);
        if (activeUsage) {
          await query(
            "UPDATE vehicle_usages SET returned_at = $1, status = 'RETURNED' WHERE id = $2",
            [timestamp, activeUsage.id]
          );
        } else {
          await query(
            "UPDATE vehicle_usages SET returned_at = $1, status = 'RETURNED' WHERE vehicle_id = $2 AND status = 'IN_USE'",
            [timestamp, vehicleId]
          );
        }
      } catch {
        vehicle.status = newStatus;
        memoryUsages = memoryUsages.map((u) =>
          u.vehicleId === vehicleId && u.status === 'IN_USE'
            ? { ...u, status: 'RETURNED', returnedAt: timestamp }
            : u
        );
        globalStore.memoryUsages = memoryUsages;
      }
    }

    return NextResponse.json({ success: true, vehicleId, action });
  } catch (error: unknown) {
    console.error('[API Frota POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar operação de frota' }, { status: 500 });
  }
}
