import {
  validateCreateVehicleNote,
  validateResolveVehicleNote,
  getCategoryDisplayName,
} from '../src/lib/maintenance-validator';
import { VehicleNoteCategory } from '../src/types';

describe('Módulo de Manutenção e Alertas de Frota (Issue #5)', () => {
  describe('Validação de Criação de Nota de Manutenção', () => {
    test('Valida criação de nota com dados válidos', () => {
      const result = validateCreateVehicleNote({
        vehicleId: 'v1',
        category: 'BRAKES',
        noteText: 'Pastilha de freio chiando na dianteira',
      });
      expect(result.valid).toBe(true);
    });

    test('Rejeita nota com categoria inválida', () => {
      const result = validateCreateVehicleNote({
        vehicleId: 'v1',
        category: 'TURBO' as unknown as VehicleNoteCategory,
        noteText: 'Motor turbo',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Categoria inválida');
    });

    test('Rejeita nota com descrição vazia ou apenas espaços', () => {
      const result = validateCreateVehicleNote({
        vehicleId: 'v1',
        category: 'OIL',
        noteText: '   ',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Descrição');
    });

    test('Rejeita nota sem identificador de veículo', () => {
      const result = validateCreateVehicleNote({
        vehicleId: '',
        category: 'TIRES',
        noteText: 'Pneu furado',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Veículo');
    });
  });

  describe('Validação de Resolução de Alerta (Baixa de Manutenção)', () => {
    test('Permite que usuário com role ADMIN dê baixa na manutenção', () => {
      const result = validateResolveVehicleNote({
        userRole: 'ADMIN',
        noteId: 'note-123',
      });
      expect(result.allowed).toBe(true);
    });

    test('Bloqueia tentativa de baixa por usuário com role EMPLOYEE', () => {
      const result = validateResolveVehicleNote({
        userRole: 'EMPLOYEE',
        noteId: 'note-123',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Apenas o gestor (ADMIN)');
    });

    test('Rejeita baixa sem noteId informado', () => {
      const result = validateResolveVehicleNote({
        userRole: 'ADMIN',
        noteId: '',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Identificador da nota');
    });
  });

  describe('Nomes e Ícones Canônicos de Categorias', () => {
    test('Retorna nome formatado e emoji de cada categoria', () => {
      expect(getCategoryDisplayName('OIL')).toContain('Óleo');
      expect(getCategoryDisplayName('BRAKES')).toContain('Freio');
      expect(getCategoryDisplayName('TIRES')).toContain('Pneu');
      expect(getCategoryDisplayName('LIGHTS')).toContain('Farol');
      expect(getCategoryDisplayName('GENERAL')).toContain('Geral');
    });
  });
});
