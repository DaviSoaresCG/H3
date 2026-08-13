import { TimeEntryType } from '@/types';
import { isOutsideRadius } from '@/lib/geofence';

export type EmployeeWorkStatus = 'FORA_DO_EXPEDIENTE' | 'EM_EXPEDIENTE' | 'EM_INTERVALO';

export interface GeofenceCheckParams {
  userLat: number | null;
  userLon: number | null;
  hqLat: number | null;
  hqLon: number | null;
  hqRadiusMeters: number;
  isInActiveTrip?: boolean;
}

export interface ClockOutValidationParams {
  transcriptionText?: string | null;
  audioUrl?: string | null;
  isFallbackText?: boolean;
  fallbackReason?: string | null;
}

/**
 * Determina o status operacional do funcionário com base na sua última batida de ponto
 */
export function determineEmployeeStatus(lastEntryType?: TimeEntryType): EmployeeWorkStatus {
  if (!lastEntryType || lastEntryType === 'CLOCK_OUT') {
    return 'FORA_DO_EXPEDIENTE';
  }
  if (lastEntryType === 'CLOCK_IN' || lastEntryType === 'MEAL_END') {
    return 'EM_EXPEDIENTE';
  }
  if (lastEntryType === 'MEAL_START') {
    return 'EM_INTERVALO';
  }
  return 'FORA_DO_EXPEDIENTE';
}

/**
 * Valida a transição de estado da jornada de trabalho e impõe a invariante INV-02
 */
export function validateTimeEntryTransition(
  lastEntryType: TimeEntryType | undefined,
  requestedType: TimeEntryType
): { allowed: boolean; error?: string } {
  const currentStatus = determineEmployeeStatus(lastEntryType);

  switch (requestedType) {
    case 'CLOCK_IN':
      // INV-02: Não permitir CLOCK_IN com ponto anterior aberto
      if (currentStatus !== 'FORA_DO_EXPEDIENTE') {
        return {
          allowed: false,
          error: 'INV-02: Não é permitido bater ponto de entrada com um ponto anterior aberto sem saída.',
        };
      }
      return { allowed: true };

    case 'MEAL_START':
      if (currentStatus !== 'EM_EXPEDIENTE') {
        return {
          allowed: false,
          error: 'Início de intervalo só pode ser registrado durante o expediente.',
        };
      }
      return { allowed: true };

    case 'MEAL_END':
      if (currentStatus !== 'EM_INTERVALO') {
        return {
          allowed: false,
          error: 'Retorno de intervalo só pode ser registrado quando em intervalo.',
        };
      }
      return { allowed: true };

    case 'CLOCK_OUT':
      if (currentStatus !== 'EM_EXPEDIENTE') {
        return {
          allowed: false,
          error: 'Ponto de saída só pode ser registrado durante o expediente.',
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, error: 'Tipo de ponto desconhecido.' };
  }
}

/**
 * Valida os requisitos de diário de atividades e justificativa no CLOCK_OUT (Invariante INV-01)
 */
export function validateClockOutRequirements(params: ClockOutValidationParams): {
  valid: boolean;
  error?: string;
} {
  const { transcriptionText, audioUrl, isFallbackText, fallbackReason } = params;

  if (!transcriptionText && !audioUrl) {
    return {
      valid: false,
      error: 'INV-01: O ponto de saída exige gravação de relato em áudio ou texto de fallback',
    };
  }

  if (isFallbackText && !fallbackReason?.trim()) {
    return {
      valid: false,
      error: 'Justificativa obrigatória quando utilizar relato em texto de fallback',
    };
  }

  return { valid: true };
}

/**
 * Calcula se a batida de ponto ocorreu fora do raio da sede e sem viagem ativa para o usuário
 */
export function calculateIsOutsideHq(params: GeofenceCheckParams): boolean {
  const { userLat, userLon, hqLat, hqLon, hqRadiusMeters, isInActiveTrip = false } = params;

  // Se está em viagem ativa, não dispara alerta de fora da sede
  if (isInActiveTrip) {
    return false;
  }

  // Se GPS indisponível, não marca como fora da sede
  if (userLat === null || userLon === null || hqLat === null || hqLon === null) {
    return false;
  }

  return isOutsideRadius(userLat, userLon, hqLat, hqLon, hqRadiusMeters);
}
