import {
  calculateTimesheetSummary,
  validateManualAdjustment,
  isSundayDate,
} from '../src/lib/timesheet-calculator';
import { StoredTimeEntry } from '../src/types';

describe('Módulo de Fechamento de Folha, Ajustes Auditados e Espelho (Issue #9)', () => {
  describe('Validação de Ajuste Manual de Ponto (INV-04)', () => {
    test('Permite ajuste com justificativa válida por usuário ADMIN', () => {
      const result = validateManualAdjustment({
        role: 'ADMIN',
        timeEntryId: 'entry-123',
        newTimestamp: '2026-08-13T18:00:00Z',
        adjustmentReason: 'Esqueceu de registrar saída ao término do evento no Buffet França',
      });

      expect(result.valid).toBe(true);
    });

    test('Rejeita ajuste manual sem justificativa', () => {
      const result = validateManualAdjustment({
        role: 'ADMIN',
        timeEntryId: 'entry-123',
        newTimestamp: '2026-08-13T18:00:00Z',
        adjustmentReason: '   ',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Justificativa');
    });

    test('Rejeita ajuste feito por usuário não-ADMIN (INV-04)', () => {
      const result = validateManualAdjustment({
        role: 'EMPLOYEE',
        timeEntryId: 'entry-123',
        newTimestamp: '2026-08-13T18:00:00Z',
        adjustmentReason: 'Ajuste solicitado pelo gestor',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('ADMIN');
    });
  });

  describe('Identificação de Domingos e Regras de Feriados', () => {
    test('Identifica corretamente domingos', () => {
      // 2026-08-16 é domingo
      expect(isSundayDate('2026-08-16')).toBe(true);
      // 2026-08-17 é segunda-feira
      expect(isSundayDate('2026-08-17')).toBe(false);
    });
  });

  describe('Cálculo Consolidado do Espelho de Ponto', () => {
    const mockWeekdayEntries: StoredTimeEntry[] = [
      {
        id: '1',
        user_id: 'u1',
        timestamp: '2026-08-10T08:00:00Z',
        entry_type: 'CLOCK_IN',
        latitude: null,
        longitude: null,
        gps_status: 'OK',
        is_outside_hq: false,
      },
      {
        id: '2',
        user_id: 'u1',
        timestamp: '2026-08-10T12:00:00Z',
        entry_type: 'MEAL_START',
        latitude: null,
        longitude: null,
        gps_status: 'OK',
        is_outside_hq: false,
      },
      {
        id: '3',
        user_id: 'u1',
        timestamp: '2026-08-10T13:00:00Z',
        entry_type: 'MEAL_END',
        latitude: null,
        longitude: null,
        gps_status: 'OK',
        is_outside_hq: false,
      },
      {
        id: '4',
        user_id: 'u1',
        timestamp: '2026-08-10T17:00:00Z',
        entry_type: 'CLOCK_OUT',
        latitude: null,
        longitude: null,
        gps_status: 'OK',
        is_outside_hq: false,
      },
    ];

    test('Calcula horas regulares, adicionais de viagem e técnicas', () => {
      const summary = calculateTimesheetSummary({
        entries: mockWeekdayEntries,
        techniqueServicesCount: 2, // 2 técnicas = R$ 300,00
        travelDaysCount: 3, // 3 dias = R$ 450,00
        sundayRule: 'OVERTIME_100',
      });

      expect(summary.totalWorkedHours).toBe(8); // 8:00 às 17:00 com 1h intervalo = 8h
      expect(summary.totalTechniquesCentavos).toBe(30000); // R$ 300,00
      expect(summary.totalTravelCentavos).toBe(45000); // R$ 450,00
      expect(summary.grandTotalBonusCentavos).toBe(75000); // R$ 750,00
    });

    test('Aplica cálculo de domingo com Diária Fixa (R$ 150/dia)', () => {
      const sundayEntries: StoredTimeEntry[] = [
        {
          id: 's1',
          user_id: 'u1',
          timestamp: '2026-08-16T08:00:00Z', // Domingo
          entry_type: 'CLOCK_IN',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: 's2',
          user_id: 'u1',
          timestamp: '2026-08-16T16:00:00Z',
          entry_type: 'CLOCK_OUT',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
      ];

      const summary = calculateTimesheetSummary({
        entries: sundayEntries,
        sundayRule: 'FIXED_DAILY',
      });

      expect(summary.sundayDaysCount).toBe(1);
      expect(summary.sundayBonusCentavos).toBe(15000); // R$ 150,00
      expect(summary.grandTotalBonusCentavos).toBe(15000);
    });
  });
});
