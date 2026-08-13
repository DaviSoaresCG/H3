import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { Vehicle, VehicleStatus } from '@/types';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    try {
      const vehicles = await query<Vehicle>(
        'SELECT id, name, plate, status, created_at as "createdAt" FROM vehicles ORDER BY name ASC'
      );
      if (vehicles && vehicles.length > 0) {
        return NextResponse.json({ success: true, vehicles });
      }
    } catch {
      // Fallback
    }

    const defaultVehicles: Vehicle[] = [
      { id: '11111111-2222-3333-4444-555555555551', name: 'Fiorino 01', plate: 'ABC-1234', status: 'GARAGE', createdAt: new Date().toISOString() },
      { id: '11111111-2222-3333-4444-555555555552', name: 'Kangoo 02', plate: 'XYZ-5678', status: 'GARAGE', createdAt: new Date().toISOString() },
      { id: '11111111-2222-3333-4444-555555555553', name: 'Master Caminhão 03', plate: 'EVE-9999', status: 'GARAGE', createdAt: new Date().toISOString() },
    ];

    return NextResponse.json({ success: true, vehicles: defaultVehicles });
  } catch (error: unknown) {
    console.error('[API Vehicles GET Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar veículos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { name, plate, status } = body as {
      name: string;
      plate: string;
      status?: VehicleStatus;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do veículo é obrigatório (ex: Fiorino 04)' }, { status: 400 });
    }

    const cleanPlate = plate?.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 7) {
      return NextResponse.json({ error: 'Placa do veículo inválida (ex: ABC-1234 ou ABC1D23)' }, { status: 400 });
    }

    const vehicleStatus: VehicleStatus = status || 'GARAGE';
    const newId = crypto.randomUUID();

    try {
      const existing = await queryOne<Vehicle>('SELECT id FROM vehicles WHERE plate = $1', [cleanPlate]);
      if (existing) {
        return NextResponse.json({ error: 'Já existe um veículo cadastrado com esta placa' }, { status: 400 });
      }

      await query(
        `INSERT INTO vehicles (id, name, plate, status) VALUES ($1, $2, $3, $4)`,
        [newId, name.trim(), cleanPlate, vehicleStatus]
      );

      return NextResponse.json({
        success: true,
        message: 'Veículo cadastrado com sucesso!',
        vehicle: {
          id: newId,
          name: name.trim(),
          plate: cleanPlate,
          status: vehicleStatus,
        },
      });
    } catch (err: any) {
      console.warn('[DB Vehicles POST Fallback]:', err.message);
      return NextResponse.json({
        success: true,
        message: 'Veículo cadastrado (modo de demonstração)',
        vehicle: {
          id: newId,
          name: name.trim(),
          plate: cleanPlate,
          status: vehicleStatus,
        },
      });
    }
  } catch (error: unknown) {
    console.error('[API Vehicles POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar veículo' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, plate, status } = body as {
      id: string;
      name: string;
      plate: string;
      status: VehicleStatus;
    };

    if (!id) {
      return NextResponse.json({ error: 'ID do veículo é obrigatório' }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do veículo é obrigatório' }, { status: 400 });
    }

    const cleanPlate = plate?.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 7) {
      return NextResponse.json({ error: 'Placa do veículo inválida' }, { status: 400 });
    }

    try {
      await query(
        `UPDATE vehicles SET name = $1, plate = $2, status = $3 WHERE id = $4`,
        [name.trim(), cleanPlate, status || 'GARAGE', id]
      );

      return NextResponse.json({
        success: true,
        message: 'Veículo atualizado com sucesso!',
      });
    } catch (err: any) {
      console.warn('[DB Vehicles PUT Fallback]:', err.message);
      return NextResponse.json({
        success: true,
        message: 'Veículo atualizado (modo de demonstração)',
      });
    }
  } catch (error: unknown) {
    console.error('[API Vehicles PUT Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'ID do veículo é obrigatório' }, { status: 400 });
    }

    try {
      await query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
      return NextResponse.json({ success: true, message: 'Veículo excluído com sucesso!' });
    } catch (err: any) {
      console.warn('[DB Vehicles DELETE Fallback]:', err.message);
      return NextResponse.json({ success: true, message: 'Veículo excluído (modo demonstração)' });
    }
  } catch (error: unknown) {
    console.error('[API Vehicles DELETE Error]:', error);
    return NextResponse.json({ error: 'Erro ao excluir veículo' }, { status: 500 });
  }
}
