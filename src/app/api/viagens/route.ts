import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';
import {
  validateCreateTrip,
  calculateTripDays,
  calculateTripAllowance,
  determineTripStatus,
} from '@/lib/trip-validator';
import { TripWithDetails, TripStatus, Vehicle, VehicleUsageWithDetails } from '@/types';

interface GlobalTripsStore {
  memoryTrips?: TripWithDetails[];
  memoryVehicles?: Vehicle[];
  memoryUsages?: VehicleUsageWithDetails[];
}

const globalStore = globalThis as unknown as GlobalTripsStore;

if (!globalStore.memoryTrips) {
  globalStore.memoryTrips = [];
}

const memoryTrips = globalStore.memoryTrips;

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
      const dbTrips = await query<{
        id: string;
        title: string;
        destinationCity: string;
        startDate: string;
        endDate: string;
        dailyAllowanceCentavos: number;
        status?: TripStatus;
        createdAt: string;
      }>(
        'SELECT id, title, destination_city as "destinationCity", start_date as "startDate", end_date as "endDate", daily_allowance_centavos as "dailyAllowanceCentavos", status, created_at as "createdAt" FROM trips ORDER BY start_date DESC'
      );

      if (dbTrips && dbTrips.length > 0) {
        const enrichedTrips: TripWithDetails[] = await Promise.all(
          dbTrips.map(async (t) => {
            const participants = await query<any>(
              `SELECT tp.id, tp.trip_id as "tripId", tp.user_id as "userId", tp.days_count as "daysCount", 
                      tp.total_allowance_centavos as "totalAllowanceCentavos", u.name as "userName", u.cpf as "userCpf"
               FROM trip_participants tp
               JOIN users u ON u.id = tp.user_id
               WHERE tp.trip_id = $1`,
              [t.id]
            );
            const vehicles = await query<any>(
              `SELECT tv.id, tv.trip_id as "tripId", tv.vehicle_id as "vehicleId", v.name as "vehicleName", v.plate
               FROM trip_vehicles tv
               JOIN vehicles v ON v.id = tv.vehicle_id
               WHERE tv.trip_id = $1`,
              [t.id]
            );

            const days = calculateTripDays(t.startDate, t.endDate);
            const allowance = t.dailyAllowanceCentavos || DAILY_TRAVEL_ALLOWANCE_CENTAVOS;
            const totalBudget = (participants?.length || 0) * days * allowance;
            const computedStatus: TripStatus = t.status === 'COMPLETED' ? 'COMPLETED' : determineTripStatus(t.startDate, t.endDate);

            return {
              ...t,
              status: computedStatus,
              totalDays: days,
              totalBudgetCentavos: totalBudget,
              participants: participants || [],
              vehicles: vehicles || [],
            };
          })
        );

        let result = enrichedTrips;
        if (userId) {
          result = result.filter((tr) => tr.participants.some((p) => p.userId === userId));
        }
        return NextResponse.json({ success: true, trips: result });
      }
    } catch {
      // Fallback em memória
    }

    let result = [...memoryTrips];
    if (userId) {
      result = result.filter((tr) => tr.participants.some((p) => p.userId === userId));
    }
    return NextResponse.json({ success: true, trips: result });
  } catch (error: unknown) {
    console.error('[API Viagens GET Error]:', error);
    return NextResponse.json({ error: 'Erro ao buscar viagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Autorização necessária (Apenas Administrador)' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      destinationCity,
      startDate,
      endDate,
      participantIds,
      vehicleIds,
    } = body as {
      title: string;
      destinationCity: string;
      startDate: string;
      endDate: string;
      participantIds?: string[];
      vehicleIds?: string[];
    };

    const validation = validateCreateTrip({
      title,
      destinationCity,
      startDate,
      endDate,
      participantIds,
      vehicleIds,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const daysCount = validation.daysCount || calculateTripDays(startDate, endDate);
    const allowance = DAILY_TRAVEL_ALLOWANCE_CENTAVOS;
    const individualAllowance = calculateTripAllowance(daysCount, allowance);
    const tripId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status: TripStatus = determineTripStatus(startDate, endDate);
    const primaryUserId = participantIds && participantIds.length > 0 ? participantIds[0] : payload.userId;

    // Persiste no DB
    try {
      await query(
        `INSERT INTO trips (id, title, destination_city, start_date, end_date, daily_allowance_centavos, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tripId, title, destinationCity, startDate, endDate, allowance, status, createdAt]
      );

      if (participantIds && participantIds.length > 0) {
        for (const pId of participantIds) {
          const partId = crypto.randomUUID();
          await query(
            `INSERT INTO trip_participants (id, trip_id, user_id, days_count, total_allowance_centavos)
             VALUES ($1, $2, $3, $4, $5)`,
            [partId, tripId, pId, daysCount, individualAllowance]
          );
        }
      }

      if (vehicleIds && vehicleIds.length > 0) {
        for (const vId of vehicleIds) {
          const tvId = crypto.randomUUID();
          const usageId = crypto.randomUUID();
          await query(
            `INSERT INTO trip_vehicles (id, trip_id, vehicle_id) VALUES ($1, $2, $3)`,
            [tvId, tripId, vId]
          );
          // Atualiza status do veículo e registra uso no histórico (INV-03 / AGENTS.md §2)
          await query("UPDATE vehicles SET status = 'TRIP' WHERE id = $1", [vId]);
          await query(
            `INSERT INTO vehicle_usages (id, vehicle_id, user_id, picked_up_at, status)
             VALUES ($1, $2, $3, $4, 'ON_TRIP')`,
            [usageId, vId, primaryUserId, createdAt]
          );
        }
      }
    } catch {
      // Fallback em memória
      if (globalStore.memoryVehicles && vehicleIds) {
        for (const vId of vehicleIds) {
          const v = globalStore.memoryVehicles.find((veh) => veh.id === vId);
          if (v) v.status = 'TRIP';
        }
      }
    }

    const tripRecord: TripWithDetails = {
      id: tripId,
      title,
      destinationCity,
      startDate,
      endDate,
      dailyAllowanceCentavos: allowance,
      status,
      createdAt,
      totalDays: daysCount,
      totalBudgetCentavos: (participantIds?.length || 0) * individualAllowance,
      participants: (participantIds || []).map((pId) => ({
        id: crypto.randomUUID(),
        tripId,
        userId: pId,
        daysCount,
        totalAllowanceCentavos: individualAllowance,
      })),
      vehicles: (vehicleIds || []).map((vId) => ({
        id: crypto.randomUUID(),
        tripId,
        vehicleId: vId,
      })),
    };

    memoryTrips.unshift(tripRecord);
    globalStore.memoryTrips = memoryTrips;

    return NextResponse.json({
      success: true,
      trip: tripRecord,
    });
  } catch (error: unknown) {
    console.error('[API Viagens POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao agendar viagem' }, { status: 500 });
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
    const { tripId } = body as { tripId: string };

    if (!tripId) {
      return NextResponse.json({ error: 'ID da viagem é obrigatório' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    try {
      await query("UPDATE trips SET status = 'COMPLETED' WHERE id = $1", [tripId]);

      // Retorna veículos da viagem para a garagem e atualiza histórico em vehicle_usages (INV-03)
      const tripVehicles = await query<{ vehicle_id: string }>(
        'SELECT vehicle_id FROM trip_vehicles WHERE trip_id = $1',
        [tripId]
      );
      if (tripVehicles && tripVehicles.length > 0) {
        for (const tv of tripVehicles) {
          await query("UPDATE vehicles SET status = 'GARAGE' WHERE id = $1", [tv.vehicle_id]);
          await query(
            "UPDATE vehicle_usages SET returned_at = $1, status = 'RETURNED' WHERE vehicle_id = $2 AND status = 'ON_TRIP'",
            [timestamp, tv.vehicle_id]
          );
        }
      }
    } catch {
      // Fallback
    }

    const trip = memoryTrips.find((t) => t.id === tripId);
    if (trip) {
      trip.status = 'COMPLETED';
      if (globalStore.memoryVehicles && trip.vehicles) {
        for (const tv of trip.vehicles) {
          const veh = globalStore.memoryVehicles.find((v) => v.id === tv.vehicleId);
          if (veh) veh.status = 'GARAGE';
        }
      }
    }
    globalStore.memoryTrips = memoryTrips;

    return NextResponse.json({ success: true, tripId, status: 'COMPLETED' });
  } catch (error: unknown) {
    console.error('[API Viagens PATCH Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar viagem' }, { status: 500 });
  }
}
