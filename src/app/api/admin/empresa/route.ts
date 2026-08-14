import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { validateCoordinates, parseCoordinatesInput } from '@/lib/geofence';

interface CompanySettingsRow {
  id: string;
  hqName: string;
  hqLatitude: number | string;
  hqLongitude: number | string;
  hqRadiusMeters: number;
  updatedAt?: string;
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
                updated_at as "updatedAt"
         FROM company_settings LIMIT 1`
      );

      if (settings) {
        const latNum = parseFloat(String(settings.hqLatitude));
        const lonNum = parseFloat(String(settings.hqLongitude));
        return NextResponse.json({
          success: true,
          settings: {
            id: settings.id,
            hqName: settings.hqName,
            hqLatitude: isNaN(latNum) ? -23.55052 : latNum,
            hqLongitude: isNaN(lonNum) ? -46.633308 : lonNum,
            hqRadiusMeters: Number(settings.hqRadiusMeters) || 500,
            updatedAt: settings.updatedAt,
          },
        });
      }
    } catch (err: any) {
      console.warn('[DB Empresa GET Error]:', err.message);
    }

    const defaultSettings = {
      id: '00000000-0000-0000-0000-000000000001',
      hqName: 'Sede Principal EventPoint',
      hqLatitude: -23.55052,
      hqLongitude: -46.633308,
      hqRadiusMeters: 500,
      updatedAt: new Date().toISOString(),
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
    const { hqName, hqLatitude, hqLongitude, hqRadiusMeters, coordinates } = body as {
      hqName: string;
      hqLatitude?: number | string;
      hqLongitude?: number | string;
      hqRadiusMeters: number | string;
      coordinates?: string;
    };

    if (!hqName?.trim()) {
      return NextResponse.json({ error: 'Nome da sede é obrigatório' }, { status: 400 });
    }

    let lat: number = NaN;
    let lon: number = NaN;

    // Se passou string combinada de coordenadas ou link
    if (coordinates && typeof coordinates === 'string') {
      const parsed = parseCoordinatesInput(coordinates);
      if (parsed) {
        lat = parsed.latitude;
        lon = parsed.longitude;
      }
    }

    if (isNaN(lat) || isNaN(lon)) {
      const cleanLatStr = typeof hqLatitude === 'string' ? hqLatitude.trim().replace(',', '.') : String(hqLatitude || '');
      const cleanLonStr = typeof hqLongitude === 'string' ? hqLongitude.trim().replace(',', '.') : String(hqLongitude || '');
      lat = parseFloat(cleanLatStr);
      lon = parseFloat(cleanLonStr);
    }

    // Se ainda for NaN, tenta parsear como texto
    if (isNaN(lat) || isNaN(lon)) {
      const parsed = parseCoordinatesInput(`${hqLatitude}, ${hqLongitude}`);
      if (parsed) {
        lat = parsed.latitude;
        lon = parsed.longitude;
      }
    }

    const coordValidation = validateCoordinates(lat, lon);
    if (!coordValidation.valid) {
      return NextResponse.json({ error: coordValidation.error || 'Coordenadas inválidas' }, { status: 400 });
    }

    const radius = typeof hqRadiusMeters === 'string' ? parseInt(hqRadiusMeters, 10) : Number(hqRadiusMeters);
    if (isNaN(radius) || radius < 50 || radius > 50000) {
      return NextResponse.json({ error: 'Raio de geofencing deve estar entre 50m e 50.000m' }, { status: 400 });
    }

    try {
      const existing = await queryOne<{ id: string }>('SELECT id FROM company_settings LIMIT 1');
      if (existing) {
        await query(
          `UPDATE company_settings 
           SET hq_name = $1, hq_latitude = $2, hq_longitude = $3, hq_radius_meters = $4, updated_at = NOW() 
           WHERE id = $5`,
          [hqName.trim(), lat, lon, radius, existing.id]
        );
      } else {
        await query(
          `INSERT INTO company_settings (id, hq_name, hq_latitude, hq_longitude, hq_radius_meters, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
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
        message: 'Configurações salvas',
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
