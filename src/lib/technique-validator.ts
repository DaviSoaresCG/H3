import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '@/lib/constants';

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
} {
  const { eventName, serviceDate, techniquesCount } = params;

  if (!eventName?.trim()) {
    return { valid: false, error: 'Nome do evento é obrigatório.' };
  }

  if (!serviceDate?.trim()) {
    return { valid: false, error: 'Data do serviço é obrigatória.' };
  }

  const parsedDate = new Date(serviceDate + 'T00:00:00');
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Data do serviço inválida.' };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (serviceDate > todayStr) {
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

  return { valid: true };
}
