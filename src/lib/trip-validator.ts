import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';

export type TripStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface CreateTripParams {
  title?: string;
  destinationCity?: string;
  startDate?: string;
  endDate?: string;
  dailyAllowanceCentavos?: number;
  participantIds?: string[];
  vehicleIds?: string[];
}

/**
 * Calcula a quantidade de dias corridos inclusivos entre a data inicial e final da viagem.
 */
export function calculateTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    throw new Error('Data inválida: a data final deve ser igual ou posterior à data inicial.');
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Calcula o valor total de diárias por funcionário (dias * valor da diária).
 */
export function calculateTripAllowance(
  daysCount: number,
  dailyAllowanceCentavos: number = DAILY_TRAVEL_ALLOWANCE_CENTAVOS
): number {
  if (daysCount <= 0) return 0;
  return daysCount * dailyAllowanceCentavos;
}

/**
 * Valida os dados de entrada para criação de uma viagem.
 */
export function validateCreateTrip(params: CreateTripParams): {
  valid: boolean;
  error?: string;
  daysCount?: number;
} {
  const { title, destinationCity, startDate, endDate, participantIds } = params;

  if (!title?.trim()) {
    return { valid: false, error: 'Título da viagem é obrigatório.' };
  }

  if (!destinationCity?.trim()) {
    return { valid: false, error: 'Cidade de destino é obrigatória.' };
  }

  if (!startDate || !endDate) {
    return { valid: false, error: 'Data de início e término são obrigatórias.' };
  }

  let daysCount = 0;
  try {
    daysCount = calculateTripDays(startDate, endDate);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Data inválida';
    return { valid: false, error: msg };
  }

  if (!participantIds || participantIds.length === 0) {
    return { valid: false, error: 'Selecione pelo menos um funcionário para a viagem.' };
  }

  return { valid: true, daysCount };
}

/**
 * Determina o status operacional da viagem com base na data atual e flags.
 */
export function determineTripStatus(
  startDate: string,
  endDate: string,
  isExplicitlyClosed: boolean = false
): TripStatus {
  if (isExplicitlyClosed) {
    return 'COMPLETED';
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (todayStr < startDate) {
    return 'PLANNED';
  }

  if (todayStr >= startDate && todayStr <= endDate) {
    return 'ACTIVE';
  }

  return 'COMPLETED';
}
