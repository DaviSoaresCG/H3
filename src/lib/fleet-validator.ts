import { Vehicle, VehicleUsage, VehicleStatus } from '@/types';

export interface VehicleReturnParams {
  vehicle: Vehicle;
  activeUsage?: VehicleUsage | null;
  requestingUserId?: string;
  isAdmin?: boolean;
}

/**
 * Valida a permissão para retirada de um veículo da garagem
 */
export function validateVehiclePickup(
  vehicle: Vehicle,
  activeUsages: VehicleUsage[]
): { allowed: boolean; error?: string } {
  if (vehicle.status === 'ON_ROAD') {
    return { allowed: false, error: `O veículo ${vehicle.name} já está em uso na rua.` };
  }

  if (vehicle.status === 'TRIP') {
    return { allowed: false, error: `O veículo ${vehicle.name} está em viagem agendada.` };
  }

  const isAlreadyInUse = activeUsages.some(
    (u) => u.vehicleId === vehicle.id && u.status === 'IN_USE'
  );

  if (isAlreadyInUse) {
    return { allowed: false, error: `O veículo ${vehicle.name} já está em uso ativo.` };
  }

  return { allowed: true };
}

/**
 * Valida a permissão para devolução de um veículo
 */
export function validateVehicleReturn(params: VehicleReturnParams): {
  allowed: boolean;
  error?: string;
} {
  const { vehicle, activeUsage, requestingUserId, isAdmin = false } = params;

  if (vehicle.status === 'GARAGE' && !activeUsage) {
    return { allowed: false, error: `O veículo ${vehicle.name} já se encontra na garagem.` };
  }

  if (activeUsage && requestingUserId) {
    const isDriver = activeUsage.userId === requestingUserId;
    if (!isDriver && !isAdmin) {
      return {
        allowed: false,
        error: 'Apenas o motorista responsável ou a administração podem registrar a devolução deste veículo.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Invariante INV-03: Devolução transita status de veículo para GARAGE
 */
export function getVehicleStatusAfterReturn(): VehicleStatus {
  return 'GARAGE';
}
