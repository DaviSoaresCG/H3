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
 * Consolida as horas trabalhadas agrupando por dia e totaliza bônus/adicionais para o fechamento mensal.
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
  } = params;

  let totalWorkedMs = 0;
  let sundayMs = 0;
  const sundayDatesWorked = new Set<string>();

  // Agrupa batidas por data (YYYY-MM-DD)
  const entriesByDay: Record<string, StoredTimeEntry[]> = {};
  for (const entry of entries) {
    const dayKey = entry.timestamp.substring(0, 10);
    if (!entriesByDay[dayKey]) {
      entriesByDay[dayKey] = [];
    }
    entriesByDay[dayKey].push(entry);
  }

  for (const [dayKey, dayEntries] of Object.entries(entriesByDay)) {
    const sorted = [...dayEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let dayIn: Date | null = null;
    let dayMealStart: Date | null = null;
    let mealMs = 0;
    let dayWorkMs = 0;

    for (const e of sorted) {
      const t = new Date(e.timestamp);
      if (e.entry_type === 'CLOCK_IN' && !dayIn) {
        dayIn = t;
        mealMs = 0;
      } else if (e.entry_type === 'MEAL_START') {
        dayMealStart = t;
      } else if (e.entry_type === 'MEAL_END' && dayMealStart) {
        mealMs += t.getTime() - dayMealStart.getTime();
        dayMealStart = null;
      } else if (e.entry_type === 'CLOCK_OUT' && dayIn) {
        const span = t.getTime() - dayIn.getTime() - mealMs;
        if (span > 0) {
          dayWorkMs += span;
        }
        dayIn = null;
        mealMs = 0;
      }
    }

    if (dayWorkMs > 0) {
      totalWorkedMs += dayWorkMs;
      if (isSundayDate(dayKey)) {
        sundayMs += dayWorkMs;
        sundayDatesWorked.add(dayKey);
      }
    }
  }

  const totalWorkedHours = Number((totalWorkedMs / (1000 * 60 * 60)).toFixed(2));
  const sundayHolidayHours = Number((sundayMs / (1000 * 60 * 60)).toFixed(2));
  const regularHours = Math.max(0, Number((totalWorkedHours - sundayHolidayHours).toFixed(2)));
  const overtimeHours = Number(Math.max(0, totalWorkedHours - 176).toFixed(2));

  const sundayDaysCount = sundayDatesWorked.size;
  let sundayBonusCentavos = 0;

  if (sundayRule === 'FIXED_DAILY') {
    // Diária Fixa de R$ 150,00 por domingo trabalhado
    sundayBonusCentavos = sundayDaysCount * 15000;
  } else {
    // Horas Extras 100% (valor normal da hora + 100% adicional)
    sundayBonusCentavos = Math.round(sundayHolidayHours * hourlyRateCentavos);
  }

  const totalTechniquesCentavos = techniqueServicesCount * TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS;
  const totalTravelCentavos = travelDaysCount * DAILY_TRAVEL_ALLOWANCE_CENTAVOS;
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
