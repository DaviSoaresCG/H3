import {
  validateVehiclePickup,
  validateVehicleReturn,
  getVehicleStatusAfterReturn,
} from '../src/lib/fleet-validator';
import { Vehicle, VehicleUsage } from '../src/types';

describe('Módulo de Gestão de Frota e Transições de Estado (INV-03)', () => {
  const sampleVehicleGarage: Vehicle = {
    id: 'v1',
    name: 'Fiorino 01',
    plate: 'ABC-1234',
    status: 'GARAGE',
    createdAt: new Date().toISOString(),
  };

  const sampleVehicleOnRoad: Vehicle = {
    id: 'v2',
    name: 'Kangoo 02',
    plate: 'XYZ-5678',
    status: 'ON_ROAD',
    createdAt: new Date().toISOString(),
  };

  const sampleVehicleTrip: Vehicle = {
    id: 'v3',
    name: 'Master Caminhão',
    plate: 'TRP-9999',
    status: 'TRIP',
    createdAt: new Date().toISOString(),
  };

  describe('Validação de Retirada de Veículo (PICKUP)', () => {
    test('Permite retirada de veículo que está na garagem sem uso ativo', () => {
      const result = validateVehiclePickup(sampleVehicleGarage, []);
      expect(result.allowed).toBe(true);
    });

    test('Bloqueia retirada de veículo com status ON_ROAD', () => {
      const result = validateVehiclePickup(sampleVehicleOnRoad, []);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('já está em uso na rua');
    });

    test('Bloqueia retirada de veículo com status TRIP', () => {
      const result = validateVehiclePickup(sampleVehicleTrip, []);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('está em viagem agendada');
    });

    test('Bloqueia retirada se já existir uso ativo associado ao veículo', () => {
      const activeUsage: VehicleUsage = {
        id: 'u1',
        vehicleId: 'v1',
        userId: 'user-1',
        pickedUpAt: new Date().toISOString(),
        status: 'IN_USE',
        createdAt: new Date().toISOString(),
      };

      const result = validateVehiclePickup(sampleVehicleGarage, [activeUsage]);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('já está em uso');
    });
  });

  describe('Validação de Devolução de Veículo e Invariante INV-03', () => {
    test('INV-03: Devolução transita status de veículo para GARAGE', () => {
      expect(getVehicleStatusAfterReturn()).toBe('GARAGE');
    });

    test('Permite devolução pelo motorista que realizou a retirada', () => {
      const activeUsage: VehicleUsage = {
        id: 'u2',
        vehicleId: 'v2',
        userId: 'user-carlos',
        pickedUpAt: new Date().toISOString(),
        status: 'IN_USE',
        createdAt: new Date().toISOString(),
      };

      const result = validateVehicleReturn({
        vehicle: sampleVehicleOnRoad,
        activeUsage,
        requestingUserId: 'user-carlos',
        isAdmin: false,
      });
      expect(result.allowed).toBe(true);
    });

    test('Permite devolução por usuário ADMIN mesmo que outro motorista tenha retirado', () => {
      const activeUsage: VehicleUsage = {
        id: 'u2',
        vehicleId: 'v2',
        userId: 'user-carlos',
        pickedUpAt: new Date().toISOString(),
        status: 'IN_USE',
        createdAt: new Date().toISOString(),
      };

      const result = validateVehicleReturn({
        vehicle: sampleVehicleOnRoad,
        activeUsage,
        requestingUserId: 'user-admin',
        isAdmin: true,
      });
      expect(result.allowed).toBe(true);
    });

    test('Bloqueia devolução por outro funcionário que não é o motorista nem admin', () => {
      const activeUsage: VehicleUsage = {
        id: 'u2',
        vehicleId: 'v2',
        userId: 'user-carlos',
        pickedUpAt: new Date().toISOString(),
        status: 'IN_USE',
        createdAt: new Date().toISOString(),
      };

      const result = validateVehicleReturn({
        vehicle: sampleVehicleOnRoad,
        activeUsage,
        requestingUserId: 'user-outro-funcionario',
        isAdmin: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Apenas o motorista responsável ou a administração');
    });

    test('Bloqueia devolução de veículo que já se encontra na garagem', () => {
      const result = validateVehicleReturn({
        vehicle: sampleVehicleGarage,
        activeUsage: null,
        requestingUserId: 'user-carlos',
        isAdmin: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('já se encontra na garagem');
    });
  });
});
