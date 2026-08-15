import {
  DAILY_TRAVEL_ALLOWANCE_CENTAVOS,
  TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS,
} from '@/lib/constants';
import { UserRole, SundayHolidayRule, StoredTimeEntry } from '@/types';

export interface ManualAdjustmentParams {
  role?: UserRole | string;
  timeEntryId?: string;
  newTimestamp?: string;
  adjustmentReason?: string;
}

export interface TimesheetSummaryParams {
  entries: StoredTimeEntry[];
  techniqueServicesCount?: number;
  travelDaysCount?: number;
  sundayRule?: SundayHolidayRule;
  hourlyRateCentavos?: number;
  customTechniquesCentavos?: number;
  customTravelCentavos?: number;
}

export interface TimesheetSummaryResult {
  totalWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  sundayHolidayHours: number;
  sundayDaysCount: number;
  sundayBonusCentavos: number;
  totalTechniquesCentavos: number;
  totalTravelCentavos: number;
  grandTotalBonusCentavos: number;
}

export interface DailyBreakdownItem {
  date: string;
  dayOfWeek: string;
  isSaturday: boolean;
  isSunday: boolean;
  dailyLimitHours: number;
  workedHours: number;
  regularHours: number;
  overtimeHours: number;
  sundayHours: number;
  entries: StoredTimeEntry[];
}

/**
 * Valida a tentativa de ajuste manual de ponto pelo gestor (INV-04).
 */
export function validateManualAdjustment(params: ManualAdjustmentParams): {
  valid: boolean;
  error?: string;
} {
  const { role, timeEntryId, newTimestamp, adjustmentReason } = params;

  if (role !== 'ADMIN') {
    return {
      valid: false,
      error: 'Autorização necessária: apenas usuários com perfil ADMIN podem realizar ajustes manuais (INV-04).',
    };
  }

  if (!timeEntryId?.trim()) {
    return { valid: false, error: 'ID do registro de ponto é obrigatório.' };
  }

  if (!newTimestamp?.trim() || isNaN(new Date(newTimestamp).getTime())) {
    return { valid: false, error: 'Horário ajustado inválido.' };
  }

  if (!adjustmentReason?.trim() || adjustmentReason.trim().length < 5) {
    return {
      valid: false,
      error: 'Justificativa obrigatória: informe o motivo do ajuste manual com pelo menos 5 caracteres.',
    };
  }

  return { valid: true };
}

/**
 * Retorna true se a data informada (YYYY-MM-DD ou ISO) for um domingo.
 */
export function isSundayDate(dateInput: string): boolean {
  const dateStr = dateInput.substring(0, 10);
  const dateObj = new Date(dateStr + 'T00:00:00');
  return dateObj.getDay() === 0; // 0 = Domingo
}

/**
 * Retorna true se a data informada (YYYY-MM-DD ou ISO) for um sábado.
 */
export function isSaturdayDate(dateInput: string): boolean {
  const dateStr = dateInput.substring(0, 10);
  const dateObj = new Date(dateStr + 'T00:00:00');
  return dateObj.getDay() === 6; // 6 = Sábado
}

/**
 * Retorna o nome por extenso do dia da semana em Português
 */
export function getDayOfWeekName(dateInput: string): string {
  const dateStr = dateInput.substring(0, 10);
  const dateObj = new Date(dateStr + 'T00:00:00');
  const day = dateObj.getDay();
  const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return names[day] || 'Dia';
}

/**
 * Retorna o limite de horas normais diárias com base na escala CLT 44h semanais:
 * - Segunda a Sexta: 8.0 horas normais/dia (40h)
 * - Sábado: 4.0 horas normais/dia (4h) -> Total 44h semanais
 * - Domingo: 0.0 horas normais (100% computado como horas extras/adicional de domingo)
 */
export function getStandardDailyWorkLimit(dateInput: string): number {
  if (isSundayDate(dateInput)) return 0.0;
  if (isSaturdayDate(dateInput)) return 4.0;
  return 8.0;
}

/**
 * Calcula a discriminação diária de cada dia com batidas de ponto, identificando horas normais e extras individuais
 */
export function calculateDailyBreakdown(entries: StoredTimeEntry[]): DailyBreakdownItem[] {
  const entriesByDay: Record<string, StoredTimeEntry[]> = {};
  for (const entry of entries) {
    if (!entry.timestamp) continue;
    const d = new Date(entry.timestamp);
    const dayKey = isNaN(d.getTime())
      ? entry.timestamp.substring(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!entriesByDay[dayKey]) {
      entriesByDay[dayKey] = [];
    }
    entriesByDay[dayKey].push(entry);
  }

  const result: DailyBreakdownItem[] = [];

  for (const [dayKey, dayEntries] of Object.entries(entriesByDay)) {
    const sorted = [...dayEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let currentIn: Date | null = null;
    let currentMealStart: Date | null = null;
    let dayMealMs = 0;
    let dayWorkMs = 0;

    for (const e of sorted) {
      const t = new Date(e.timestamp);
      if (e.entry_type === 'CLOCK_IN') {
        currentIn = t;
        currentMealStart = null;
      } else if (e.entry_type === 'MEAL_START') {
        currentMealStart = t;
      } else if (e.entry_type === 'MEAL_END') {
        if (currentMealStart) {
          dayMealMs += Math.max(0, t.getTime() - currentMealStart.getTime());
          currentMealStart = null;
        }
      } else if (e.entry_type === 'CLOCK_OUT') {
        if (currentIn) {
          const span = t.getTime() - currentIn.getTime() - dayMealMs;
          if (span > 0) {
            dayWorkMs += span;
          }
          currentIn = null;
          currentMealStart = null;
          dayMealMs = 0;
        }
      }
    }

    if (currentIn) {
      const now = new Date();
      const nowDayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (dayKey === nowDayKey) {
        const span = now.getTime() - currentIn.getTime() - dayMealMs;
        if (span > 0) {
          dayWorkMs += span;
        }
      }
    }

    const dayHours = Number((dayWorkMs / (1000 * 60 * 60)).toFixed(2));
    const isSun = isSundayDate(dayKey);
    const isSat = isSaturdayDate(dayKey);
    const dailyLimit = getStandardDailyWorkLimit(dayKey);

    let reg = 0;
    let extra = 0;
    let sun = 0;

    if (isSun) {
      sun = dayHours;
    } else {
      if (dayHours <= dailyLimit) {
        reg = dayHours;
      } else {
        reg = dailyLimit;
        extra = Number((dayHours - dailyLimit).toFixed(2));
      }
    }

    result.push({
      date: dayKey,
      dayOfWeek: getDayOfWeekName(dayKey),
      isSaturday: isSat,
      isSunday: isSun,
      dailyLimitHours: dailyLimit,
      workedHours: dayHours,
      regularHours: reg,
      overtimeHours: extra,
      sundayHours: sun,
      entries: sorted,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Consolida as horas trabalhadas agrupando por dia e totaliza bônus/adicionais para o fechamento mensal.
 * Aplica a escala padrão CLT de 44h semanais (Seg-Sex: 8h normais, Sáb: 4h normais).
 */
export function calculateTimesheetSummary(
  params: TimesheetSummaryParams
): TimesheetSummaryResult {
  const {
    entries = [],
    techniqueServicesCount = 0,
    travelDaysCount = 0,
    sundayRule = 'OVERTIME_100',
    hourlyRateCentavos = 2500, // R$ 25,00/h base
    customTechniquesCentavos,
    customTravelCentavos,
  } = params;

  const dailyBreakdown = calculateDailyBreakdown(entries);

  let regularHoursAccum = 0;
  let overtimeHoursAccum = 0;
  let sundayHolidayHoursAccum = 0;
  const sundayDatesWorked = new Set<string>();

  for (const day of dailyBreakdown) {
    if (day.isSunday) {
      sundayHolidayHoursAccum += day.sundayHours;
      if (day.workedHours > 0) {
        sundayDatesWorked.add(day.date);
      }
    } else {
      regularHoursAccum += day.regularHours;
      overtimeHoursAccum += day.overtimeHours;
    }
  }

  const regularHours = Number(regularHoursAccum.toFixed(2));
  const overtimeHours = Number(overtimeHoursAccum.toFixed(2));
  const sundayHolidayHours = Number(sundayHolidayHoursAccum.toFixed(2));
  const totalWorkedHours = Number((regularHours + overtimeHours + sundayHolidayHours).toFixed(2));

  const sundayDaysCount = sundayDatesWorked.size;
  let sundayBonusCentavos = 0;

  if (sundayRule === 'FIXED_DAILY') {
    // Diária Fixa de R$ 150,00 por domingo trabalhado
    sundayBonusCentavos = sundayDaysCount * 15000;
  } else {
    // Horas Extras 100% (valor normal da hora + 100% adicional)
    sundayBonusCentavos = Math.round(sundayHolidayHours * hourlyRateCentavos);
  }

  const totalTechniquesCentavos =
    typeof customTechniquesCentavos === 'number'
      ? customTechniquesCentavos
      : techniqueServicesCount * TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS;

  const totalTravelCentavos =
    typeof customTravelCentavos === 'number'
      ? customTravelCentavos
      : travelDaysCount * DAILY_TRAVEL_ALLOWANCE_CENTAVOS;

  const grandTotalBonusCentavos = totalTechniquesCentavos + totalTravelCentavos + sundayBonusCentavos;

  return {
    totalWorkedHours,
    regularHours,
    overtimeHours,
    sundayHolidayHours,
    sundayDaysCount,
    sundayBonusCentavos,
    totalTechniquesCentavos,
    totalTravelCentavos,
    grandTotalBonusCentavos,
  };
}
