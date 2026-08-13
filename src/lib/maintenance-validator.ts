import { VehicleNoteCategory, UserRole } from '@/types';

export const VALID_NOTE_CATEGORIES: VehicleNoteCategory[] = [
  'OIL',
  'BRAKES',
  'TIRES',
  'LIGHTS',
  'GENERAL',
];

export const CATEGORY_DISPLAY_NAMES: Record<VehicleNoteCategory, string> = {
  OIL: '🛢️ Óleo / Fluídos',
  BRAKES: '🛑 Freio / Pastilha',
  TIRES: '🛞 Pneus / Alinhamento',
  LIGHTS: '💡 Farol / Iluminação',
  GENERAL: '🔧 Geral / Mecânica',
};

export interface CreateVehicleNoteParams {
  vehicleId?: string;
  category?: VehicleNoteCategory | string;
  noteText?: string;
}

export interface ResolveVehicleNoteParams {
  userRole?: UserRole | string;
  noteId?: string;
}

/**
 * Valida a criação de um novo alerta ou observação de manutenção
 */
export function validateCreateVehicleNote(params: CreateVehicleNoteParams): {
  valid: boolean;
  error?: string;
} {
  const { vehicleId, category, noteText } = params;

  if (!vehicleId?.trim()) {
    return { valid: false, error: 'Veículo é obrigatório para registrar observação.' };
  }

  if (!category || !VALID_NOTE_CATEGORIES.includes(category as VehicleNoteCategory)) {
    return {
      valid: false,
      error: `Categoria inválida. Escolha entre: ${VALID_NOTE_CATEGORIES.join(', ')}.`,
    };
  }

  if (!noteText?.trim()) {
    return { valid: false, error: 'Descrição do problema não pode ser vazia.' };
  }

  return { valid: true };
}

/**
 * Valida a autorização para dar baixa/resolver uma nota de manutenção (restrito a ADMIN)
 */
export function validateResolveVehicleNote(params: ResolveVehicleNoteParams): {
  allowed: boolean;
  error?: string;
} {
  const { userRole, noteId } = params;

  if (!noteId?.trim()) {
    return { allowed: false, error: 'Identificador da nota de manutenção é obrigatório.' };
  }

  if (userRole !== 'ADMIN') {
    return {
      allowed: false,
      error: 'Apenas o gestor (ADMIN) pode dar baixa e marcar manutenções como resolvidas.',
    };
  }

  return { allowed: true };
}

/**
 * Retorna o nome amigável com emoji para exibição no frontend a partir do mapa canônico
 */
export function getCategoryDisplayName(category: VehicleNoteCategory): string {
  return CATEGORY_DISPLAY_NAMES[category] || '🚗 Manutenção';
}
