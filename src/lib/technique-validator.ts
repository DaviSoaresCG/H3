import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '@/lib/constants';
import { normalizeDateStr } from '@/lib/date-utils';

export interface CreateTechniqueParams {
  eventName?: string;
  serviceDate?: string;
  techniquesCount?: number;
  notes?: string;
}

/**
 * Calcula o valor total a receber pelas técnicas prestadas (quantidade * R$ 150,00).
 */
export function calculateTechniquesTotal(
  techniquesCount: number,
  amountPerTechniqueCentavos: number = TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS
): number {
  if (techniquesCount <= 0) return 0;
  return techniquesCount * amountPerTechniqueCentavos;
}

/**
 * Valida a criação de um novo registro de técnica em evento.
 */
export function validateCreateTechnique(params: CreateTechniqueParams): {
  valid: boolean;
  error?: string;
  normalizedDate?: string;
} {
  const { eventName, serviceDate, techniquesCount } = params;

  if (!eventName?.trim()) {
    return { valid: false, error: 'Nome do evento é obrigatório.' };
  }

  if (!serviceDate?.trim()) {
    return { valid: false, error: 'Data do serviço é obrigatória.' };
  }

  const cleanDateStr = normalizeDateStr(serviceDate);
  if (!cleanDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
    return { valid: false, error: 'Data do serviço inválida.' };
  }

  const parsedDate = new Date(cleanDateStr + 'T00:00:00');
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Data do serviço inválida.' };
  }

  // Tolerância para fusos horários (UTC vs Brasília UTC-3)
  const now = new Date();
  const todayUTC = now.toISOString().split('T')[0];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayLocal = `${year}-${month}-${day}`;
  const maxAllowedDate = todayLocal > todayUTC ? todayLocal : todayUTC;

  if (cleanDateStr > maxAllowedDate) {
    return {
      valid: false,
      error: 'Data futura não autorizada. O serviço de técnica só pode ser registrado na data do evento ou em datas passadas.',
    };
  }

  if (typeof techniquesCount !== 'number' || techniquesCount < 1) {
    return {
      valid: false,
      error: 'Quantidade inválida: a quantidade de técnicas deve ser pelo menos 1.',
    };
  }

  return { valid: true, normalizedDate: cleanDateStr };
}

