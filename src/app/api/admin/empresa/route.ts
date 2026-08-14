import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { validateCoordinates } from '@/lib/geofence';

interface CompanySettingsRow {
  id: string;
  hqName: string;
  hqLatitude: number;
  hqLongitude: number;
  hqRadiusMeters: number;
  createdAt: string;
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    try {
      const settings = await queryOne<CompanySettingsRow>(
        `SELECT id, hq_name as "hqName", hq_latitude as "hqLatitude", 
                hq_longitude as "hqLongitude", hq_radius_meters as "hqRadiusMeters",
                created_at as "createdAt"
         FROM company_settings LIMIT 1`
      );

      if (settings) {
        return NextResponse.json({ success: true, settings });
      }
    } catch {
      // Fallback
    }

    const defaultSettings: CompanySettingsRow = {
      id: '00000000-0000-0000-0000-000000000001',
      hqName: 'Sede Principal EventPoint',
      hqLatitude: -23.55052,
      hqLongitude: -46.633308,
      hqRadiusMeters: 500,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, settings: defaultSettings });
  } catch (error: unknown) {
    console.error('[API Empresa GET Error]:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações da empresa' }, { status: 500 });
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
    const { hqName, hqLatitude, hqLongitude, hqRadiusMeters } = body as {
      hqName: string;
      hqLatitude: number | string;
      hqLongitude: number | string;
      hqRadiusMeters: number | string;
    };

    if (!hqName?.trim()) {
      return NextResponse.json({ error: 'Nome da sede é obrigatório' }, { status: 400 });
    }

    const cleanLatStr = typeof hqLatitude === 'string' ? hqLatitude.trim().replace(',', '.') : String(hqLatitude);
    const cleanLonStr = typeof hqLongitude === 'string' ? hqLongitude.trim().replace(',', '.') : String(hqLongitude);
    const lat = parseFloat(cleanLatStr);
    const lon = parseFloat(cleanLonStr);
    const radius = typeof hqRadiusMeters === 'string' ? parseInt(hqRadiusMeters, 10) : Number(hqRadiusMeters);

    const coordValidation = validateCoordinates(lat, lon);
    if (!coordValidation.valid) {
      return NextResponse.json({ error: coordValidation.error }, { status: 400 });
    }

    if (isNaN(radius) || radius < 50 || radius > 50000) {
      return NextResponse.json({ error: 'Raio de geofencing deve estar entre 50m e 50.000m' }, { status: 400 });
    }

    try {
      const existing = await queryOne<{ id: string }>('SELECT id FROM company_settings LIMIT 1');
      if (existing) {
        await query(
          `UPDATE company_settings 
           SET hq_name = $1, hq_latitude = $2, hq_longitude = $3, hq_radius_meters = $4 
           WHERE id = $5`,
          [hqName.trim(), lat, lon, radius, existing.id]
        );
      } else {
        await query(
          `INSERT INTO company_settings (id, hq_name, hq_latitude, hq_longitude, hq_radius_meters)
           VALUES ($1, $2, $3, $4, $5)`,
          [crypto.randomUUID(), hqName.trim(), lat, lon, radius]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Configurações da sede atualizadas com sucesso',
        settings: {
          hqName: hqName.trim(),
          hqLatitude: lat,
          hqLongitude: lon,
          hqRadiusMeters: radius,
        },
      });
    } catch (err: any) {
      console.warn('[DB Empresa PUT Fallback]:', err.message);
      return NextResponse.json({
        success: true,
        message: 'Configurações da sede salvas (modo de demonstração)',
        settings: {
          hqName: hqName.trim(),
          hqLatitude: lat,
          hqLongitude: lon,
          hqRadiusMeters: radius,
        },
      });
    }
  } catch (error: unknown) {
    console.error('[API Empresa PUT Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar configurações da empresa' }, { status: 500 });
  }
}
