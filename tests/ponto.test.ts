import {
  validateTimeEntryTransition,
  calculateIsOutsideHq,
  determineEmployeeStatus,
} from '../src/lib/ponto-validator';
import { TimeEntryType } from '../src/types';

describe('Validações de Jornada de Ponto e Geofence (INV-02 & Geofencing)', () => {
  describe('Transições de Estado de Ponto e Invariante INV-02', () => {
    test('Permite CLOCK_IN quando não há batidas anteriores ou última batida foi CLOCK_OUT', () => {
      expect(validateTimeEntryTransition(undefined, 'CLOCK_IN').allowed).toBe(true);
      expect(validateTimeEntryTransition('CLOCK_OUT', 'CLOCK_IN').allowed).toBe(true);
    });

    test('INV-02: Bloqueia CLOCK_IN se já houver um CLOCK_IN aberto sem CLOCK_OUT', () => {
      const resultClockIn = validateTimeEntryTransition('CLOCK_IN', 'CLOCK_IN');
      expect(resultClockIn.allowed).toBe(false);
      expect(resultClockIn.error).toContain('INV-02');

      const resultMealStart = validateTimeEntryTransition('MEAL_START', 'CLOCK_IN');
      expect(resultMealStart.allowed).toBe(false);
      expect(resultMealStart.error).toContain('INV-02');

      const resultMealEnd = validateTimeEntryTransition('MEAL_END', 'CLOCK_IN');
      expect(resultMealEnd.allowed).toBe(false);
      expect(resultMealEnd.error).toContain('INV-02');
    });

    test('Permite MEAL_START apenas quando em expediente (CLOCK_IN ou MEAL_END)', () => {
      expect(validateTimeEntryTransition('CLOCK_IN', 'MEAL_START').allowed).toBe(true);
      expect(validateTimeEntryTransition('MEAL_END', 'MEAL_START').allowed).toBe(true);
      expect(validateTimeEntryTransition('CLOCK_OUT', 'MEAL_START').allowed).toBe(false);
      expect(validateTimeEntryTransition(undefined, 'MEAL_START').allowed).toBe(false);
    });

    test('Permite MEAL_END apenas quando em intervalo (MEAL_START)', () => {
      expect(validateTimeEntryTransition('MEAL_START', 'MEAL_END').allowed).toBe(true);
      expect(validateTimeEntryTransition('CLOCK_IN', 'MEAL_END').allowed).toBe(false);
      expect(validateTimeEntryTransition('CLOCK_OUT', 'MEAL_END').allowed).toBe(false);
    });

    test('Permite CLOCK_OUT apenas quando em expediente', () => {
      expect(validateTimeEntryTransition('CLOCK_IN', 'CLOCK_OUT').allowed).toBe(true);
      expect(validateTimeEntryTransition('MEAL_END', 'CLOCK_OUT').allowed).toBe(true);
      expect(validateTimeEntryTransition('CLOCK_OUT', 'CLOCK_OUT').allowed).toBe(false);
      expect(validateTimeEntryTransition(undefined, 'CLOCK_OUT').allowed).toBe(false);
    });
  });

  describe('Cálculo de Status do Funcionário', () => {
    test('Determina corretamente os estados operacionais', () => {
      expect(determineEmployeeStatus(undefined)).toBe('FORA_DO_EXPEDIENTE');
      expect(determineEmployeeStatus('CLOCK_OUT')).toBe('FORA_DO_EXPEDIENTE');
      expect(determineEmployeeStatus('CLOCK_IN')).toBe('EM_EXPEDIENTE');
      expect(determineEmployeeStatus('MEAL_END')).toBe('EM_EXPEDIENTE');
      expect(determineEmployeeStatus('MEAL_START')).toBe('EM_INTERVALO');
    });
  });

  describe('Cálculo de Geofencing com Sede e Viagens', () => {
    const hqLat = -23.561684;
    const hqLon = -46.655981;
    const hqRadiusMeters = 500;

    test('Marca is_outside_hq = false quando dentro do raio da sede', () => {
      const nearLat = -23.562000;
      const nearLon = -46.656000;
      const isOutside = calculateIsOutsideHq({
        userLat: nearLat,
        userLon: nearLon,
        hqLat,
        hqLon,
        hqRadiusMeters,
        isInActiveTrip: false,
      });
      expect(isOutside).toBe(false);
    });

    test('Marca is_outside_hq = true quando fora do raio da sede e sem viagem ativa', () => {
      const farLat = -23.650000;
      const farLon = -46.700000;
      const isOutside = calculateIsOutsideHq({
        userLat: farLat,
        userLon: farLon,
        hqLat,
        hqLon,
        hqRadiusMeters,
        isInActiveTrip: false,
      });
      expect(isOutside).toBe(true);
    });

    test('Não marca alerta fora da sede se funcionário estiver em viagem ativa', () => {
      const farLat = -23.650000;
      const farLon = -46.700000;
      const isOutside = calculateIsOutsideHq({
        userLat: farLat,
        userLon: farLon,
        hqLat,
        hqLon,
        hqRadiusMeters,
        isInActiveTrip: true,
      });
      expect(isOutside).toBe(false);
    });

    test('Retorna false quando GPS estiver indisponível (null)', () => {
      const isOutside = calculateIsOutsideHq({
        userLat: null,
        userLon: null,
        hqLat,
        hqLon,
        hqRadiusMeters,
        isInActiveTrip: false,
      });
      expect(isOutside).toBe(false);
    });
  });
});
