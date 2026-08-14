import { AnomalyType, AnomalySeverity, GpsStatus } from '@/types';

export interface AnomalyAlert {
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  message: string;
}

/**
 * Calcula a duração em horas entre o início da jornada e o momento atual (ou data final).
 */
export function calculateShiftDurationHours(
  startTime: string | Date,
  now: string | Date = new Date()
): number {
  const start = new Date(startTime);
  const end = new Date(now);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  return diffMs / (1000 * 60 * 60);
}

/**
 * Detecta se a jornada de trabalho ativa ultrapassou o limite de 12 horas.
 */
export function detectShiftExceeded12h(
  startTime: string | Date,
  now: string | Date = new Date()
): boolean {
  return calculateShiftDurationHours(startTime, now) > 12;
}

/**
 * Detecta se um veículo retirado na garagem está na rua por mais de X horas (padrão 14h) sem devolução.
 */
export function detectOverdueVehicleUsage(
  pickedUpAt: string | Date,
  now: string | Date = new Date(),
  maxHours: number = 14
): boolean {
  return calculateShiftDurationHours(pickedUpAt, now) > maxHours;
}

/**
 * Categoriza alertas de anomalias operacionais para a visão executiva do Dono.
 */
export function categorizeAnomalyAlert(params: {
  isOutsideHq?: boolean;
  gpsStatus?: GpsStatus;
  shiftHours?: number;
  vehicleHoursOnRoad?: number;
  vehicleName?: string;
}): AnomalyAlert | null {
  const { isOutsideHq, gpsStatus, shiftHours = 0, vehicleHoursOnRoad = 0, vehicleName = 'Veículo' } = params;

  if (shiftHours > 12) {
    return {
      type: 'SHIFT_EXCEEDED_12H',
      severity: 'CRITICAL',
      title: 'Jornada Excedida (>12h)',
      message: `Funcionário em jornada contínua de ${shiftHours.toFixed(1)}h sem registro de ponto de saída.`,
    };
  }

  if (vehicleHoursOnRoad > 14) {
    return {
      type: 'VEHICLE_OVERDUE',
      severity: 'HIGH',
      title: 'Veículo Atrasado',
      message: `${vehicleName} em uso há ${vehicleHoursOnRoad.toFixed(1)}h sem devolução à garagem.`,
    };
  }

  if (isOutsideHq) {
    return {
      type: 'OUTSIDE_HQ',
      severity: 'HIGH',
      title: 'Ponto Fora da Sede',
      message: 'Batida de entrada registrada fora do raio de 500m da sede sem viagem agendada.',
    };
  }

  if (gpsStatus === 'UNAVAILABLE') {
    return {
      type: 'NO_GPS',
      severity: 'MEDIUM',
      title: 'Ponto Sem GPS',
      message: 'Batida registrada sem coordenadas de geolocalização capturadas pelo dispositivo.',
    };
  }

  return null;
}

/**
 * Retorna o badge visual e status formatado da jornada diária do colaborador
 */
export function formatEmployeePontoBadge(lastEntryType?: string | null): {
  label: string;
  badgeClass: string;
  status: 'WORKING' | 'MEAL' | 'FINISHED' | 'NO_PUNCH';
} {
  if (!lastEntryType) {
    return {
      label: 'Sem Registro Hoje',
      badgeClass: 'bg-surface-container text-on-surface-variant border-border-subtle',
      status: 'NO_PUNCH',
    };
  }

  switch (lastEntryType) {
    case 'CLOCK_IN':
    case 'MEAL_END':
      return {
        label: 'Em Expediente',
        badgeClass: 'bg-secondary-container text-on-secondary-container border-secondary/30',
        status: 'WORKING',
      };
    case 'MEAL_START':
      return {
        label: 'Em Intervalo (Almoço)',
        badgeClass: 'bg-alert-warning/20 text-navy-deep border-alert-warning/40',
        status: 'MEAL',
      };
    case 'CLOCK_OUT':
      return {
        label: 'Expediente Encerrado',
        badgeClass: 'bg-surface-container-high text-navy-deep border-border-subtle',
        status: 'FINISHED',
      };
    default:
      return {
        label: 'Ponto Registrado',
        badgeClass: 'bg-surface-container text-navy-deep border-border-subtle',
        status: 'WORKING',
      };
  }
}
