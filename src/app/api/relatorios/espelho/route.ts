import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { calculateTimesheetSummary } from '@/lib/timesheet-calculator';
import { StoredTimeEntry, User, SundayHolidayRule } from '@/types';

interface GlobalWithMemory {
  memoryTimeEntries?: StoredTimeEntry[];
  memoryTechniques?: any[];
  memoryTrips?: any[];
}

const globalStore = globalThis as unknown as GlobalWithMemory;
const memoryTimeEntries: StoredTimeEntry[] = globalStore.memoryTimeEntries || [];

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Não-admin só pode consultar o próprio espelho
    const requestedUserId = searchParams.get('userId');
    const userId = payload.role === 'ADMIN' && requestedUserId ? requestedUserId : payload.userId;
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const sundayRule: SundayHolidayRule = (searchParams.get('sundayRule') as SundayHolidayRule) || 'OVERTIME_100';

    try {
      const employee = await queryOne<User>(
        'SELECT id, cpf, name, phone, role, created_at as "createdAt" FROM users WHERE id = $1',
        [userId]
      );

      const entries = await query<any>(
        `SELECT t.id, t.user_id as "userId", t.entry_type as "entry_type", t.timestamp, 
                t.latitude, t.longitude, t.gps_status as "gpsStatus", t.is_outside_hq as "isOutsideHq",
                t.is_adjusted as "is_adjusted", t.adjusted_by as "adjustedBy", t.adjustment_reason as "adjustment_reason",
                a.transcription_text, a.audio_url, a.is_fallback_text, a.fallback_reason, a.duration_seconds
         FROM time_entries t
         LEFT JOIN audio_diaries a ON a.time_entry_id = t.id
         WHERE t.user_id = $1 AND TO_CHAR(t.timestamp, 'YYYY-MM') = $2
         ORDER BY t.timestamp ASC`,
        [userId, month]
      );

      const techniqueServices = await query<any>(
        `SELECT id, user_id as "userId", event_name as "eventName", TO_CHAR(service_date, 'YYYY-MM-DD') as "serviceDate", 
                techniques_count as "techniquesCount", amount_per_technique_centavos as "amountPerTechniqueCentavos",
                total_amount_centavos as "totalAmountCentavos", notes
         FROM event_technique_services 
         WHERE user_id = $1 AND TO_CHAR(service_date, 'YYYY-MM') = $2
         ORDER BY service_date ASC`,
        [userId, month]
      );

      const totalTechniquesCount = (techniqueServices || []).reduce(
        (acc: number, curr: any) => acc + Number(curr.techniquesCount || 1),
        0
      );
      const totalTechniquesCentavos = (techniqueServices || []).reduce(
        (acc: number, curr: any) => acc + Number(curr.totalAmountCentavos || 0),
        0
      );

      const tripParticipations = await query<any>(
        `SELECT tp.id, tp.trip_id as "tripId", tp.days_count as "daysCount", tp.total_allowance_centavos as "totalAllowanceCentavos",
                tr.title, tr.destination_city as "destinationCity", TO_CHAR(tr.start_date, 'YYYY-MM-DD') as "startDate", TO_CHAR(tr.end_date, 'YYYY-MM-DD') as "endDate", tr.status
         FROM trip_participants tp
         JOIN trips tr ON tr.id = tp.trip_id
         WHERE tp.user_id = $1 
           AND tr.status != 'CANCELLED'
           AND (TO_CHAR(tr.start_date, 'YYYY-MM') = $2 OR TO_CHAR(tr.end_date, 'YYYY-MM') = $2)
         ORDER BY tr.start_date ASC`,
        [userId, month]
      );

      const travelDaysCount = (tripParticipations || []).reduce(
        (acc: number, curr: any) => acc + Number(curr.daysCount || 0),
        0
      );
      const totalTravelCentavos = (tripParticipations || []).reduce(
        (acc: number, curr: any) => acc + Number(curr.totalAllowanceCentavos || 0),
        0
      );

      const summary = calculateTimesheetSummary({
        entries: entries || [],
        techniqueServicesCount: totalTechniquesCount,
        travelDaysCount,
        customTechniquesCentavos: totalTechniquesCentavos,
        customTravelCentavos: totalTravelCentavos,
        sundayRule,
      });

      return NextResponse.json({
        success: true,
        month,
        employee: employee || { id: userId, name: payload.name, cpf: payload.cpf, role: payload.role },
        entries: entries || [],
        techniqueServices: techniqueServices || [],
        tripParticipations: tripParticipations || [],
        summary: {
          entriesCount: entries?.length || 0,
          totalWorkedHours: summary.totalWorkedHours,
          regularHours: summary.regularHours,
          overtimeHours: summary.overtimeHours,
          sundayHolidayHours: summary.sundayHolidayHours,
          sundayDaysCount: summary.sundayDaysCount,
          sundayBonusReais: (summary.sundayBonusCentavos / 100).toFixed(2),
          techniquesCount: totalTechniquesCount,
          totalTechniquesAmountReais: (summary.totalTechniquesCentavos / 100).toFixed(2),
          travelDaysCount,
          totalTravelAllowancesReais: (summary.totalTravelCentavos / 100).toFixed(2),
          grandTotalBonusReais: (summary.grandTotalBonusCentavos / 100).toFixed(2),
        },
      });
    } catch (err: any) {
      console.warn('[Espelho DB Fallback]:', err.message);
      // Memory fallback
      const userEntries = memoryTimeEntries.filter(
        (e) => e.user_id === userId && e.timestamp.startsWith(month)
      );

      const memoryTechniques = (globalStore.memoryTechniques || []).filter(
        (t: any) => t.userId === userId && (t.serviceDate?.startsWith(month) || t.createdAt?.startsWith(month))
      );

      const memoryTrips = (globalStore.memoryTrips || []).filter(
        (tr: any) =>
          tr.status !== 'CANCELLED' &&
          (tr.startDate?.startsWith(month) || tr.endDate?.startsWith(month)) &&
          tr.participants?.some((p: any) => p.userId === userId)
      );

      const totalTechniquesCount = memoryTechniques.reduce((acc: number, curr: any) => acc + (curr.techniquesCount || 1), 0);
      const totalTechniquesCentavos = memoryTechniques.reduce((acc: number, curr: any) => acc + (curr.totalAmountCentavos || 15000), 0);

      const tripParticipations = memoryTrips.map((tr: any) => {
        const p = tr.participants.find((part: any) => part.userId === userId);
        return {
          title: tr.title,
          destinationCity: tr.destinationCity,
          startDate: tr.startDate,
          endDate: tr.endDate,
          daysCount: p?.daysCount || tr.totalDays || 1,
          totalAllowanceCentavos: p?.totalAllowanceCentavos || (tr.totalDays || 1) * 15000,
        };
      });

      const travelDaysCount = tripParticipations.reduce((acc: number, curr: any) => acc + (curr.daysCount || 0), 0);
      const totalTravelCentavos = tripParticipations.reduce((acc: number, curr: any) => acc + (curr.totalAllowanceCentavos || 0), 0);

      const summary = calculateTimesheetSummary({
        entries: userEntries,
        techniqueServicesCount: totalTechniquesCount,
        travelDaysCount,
        customTechniquesCentavos: totalTechniquesCentavos,
        customTravelCentavos: totalTravelCentavos,
        sundayRule,
      });

      return NextResponse.json({
        success: true,
        month,
        employee: { id: userId, name: payload.name, cpf: payload.cpf, role: payload.role },
        entries: userEntries,
        techniqueServices: memoryTechniques,
        tripParticipations,
        summary: {
          entriesCount: userEntries.length,
          totalWorkedHours: summary.totalWorkedHours,
          regularHours: summary.regularHours,
          overtimeHours: summary.overtimeHours,
          sundayHolidayHours: summary.sundayHolidayHours,
          sundayDaysCount: summary.sundayDaysCount,
          sundayBonusReais: (summary.sundayBonusCentavos / 100).toFixed(2),
          techniquesCount: totalTechniquesCount,
          totalTechniquesAmountReais: (summary.totalTechniquesCentavos / 100).toFixed(2),
          travelDaysCount,
          totalTravelAllowancesReais: (summary.totalTravelCentavos / 100).toFixed(2),
          grandTotalBonusReais: (summary.grandTotalBonusCentavos / 100).toFixed(2),
        },
      });
    }
  } catch (error: unknown) {
    console.error('[API Espelho Error]:', error);
    return NextResponse.json({ error: 'Erro ao gerar espelho de ponto' }, { status: 500 });
  }
}
