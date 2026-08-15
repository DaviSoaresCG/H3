import {
  calculateTimesheetSummary,
  validateManualAdjustment,
  isSundayDate,
  isSaturdayDate,
  getStandardDailyWorkLimit,
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

  describe('Identificação de Dias da Semana e Limites de Escala CLT 44h', () => {
    test('Identifica corretamente domingos', () => {
      // 2026-08-16 é domingo
      expect(isSundayDate('2026-08-16')).toBe(true);
      // 2026-08-17 é segunda-feira
      expect(isSundayDate('2026-08-17')).toBe(false);
    });

    test('Identifica corretamente sábados', () => {
      // 2026-08-15 é sábado
      expect(isSaturdayDate('2026-08-15')).toBe(true);
      // 2026-08-14 é sexta-feira
      expect(isSaturdayDate('2026-08-14')).toBe(false);
    });

    test('Retorna limite de jornada padrão correto (Seg-Sex: 8h, Sáb: 4h, Dom: 0h)', () => {
      expect(getStandardDailyWorkLimit('2026-08-14')).toBe(8.0); // Sexta-feira
      expect(getStandardDailyWorkLimit('2026-08-15')).toBe(4.0); // Sábado
      expect(getStandardDailyWorkLimit('2026-08-16')).toBe(0.0); // Domingo
    });
  });

  describe('Cálculo Consolidado do Espelho de Ponto com Escala CLT 44h', () => {
    const mockWeekdayEntries: StoredTimeEntry[] = [
      {
        id: '1',
        user_id: 'u1',
        timestamp: '2026-08-10T08:00:00Z', // Segunda-feira
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

    test('Calcula horas regulares, adicionais de viagem e técnicas em dia de semana', () => {
      const summary = calculateTimesheetSummary({
        entries: mockWeekdayEntries,
        techniqueServicesCount: 2, // 2 técnicas = R$ 300,00
        travelDaysCount: 3, // 3 dias = R$ 450,00
        sundayRule: 'OVERTIME_100',
      });

      expect(summary.totalWorkedHours).toBe(8); // 8:00 às 17:00 com 1h intervalo = 8h normais
      expect(summary.regularHours).toBe(8);
      expect(summary.overtimeHours).toBe(0);
      expect(summary.totalTechniquesCentavos).toBe(30000); // R$ 300,00
      expect(summary.totalTravelCentavos).toBe(45000); // R$ 450,00
      expect(summary.grandTotalBonusCentavos).toBe(75000); // R$ 750,00
    });

    test('Calcula horas extras em dia de semana quando excede 8 horas', () => {
      const overtimeEntries: StoredTimeEntry[] = [
        {
          id: '1',
          user_id: 'u1',
          timestamp: '2026-08-11T08:00:00Z', // Terça-feira
          entry_type: 'CLOCK_IN',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: '2',
          user_id: 'u1',
          timestamp: '2026-08-11T12:00:00Z',
          entry_type: 'MEAL_START',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: '3',
          user_id: 'u1',
          timestamp: '2026-08-11T13:00:00Z',
          entry_type: 'MEAL_END',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: '4',
          user_id: 'u1',
          timestamp: '2026-08-11T19:00:00Z', // 10 horas líquidas (08h às 19h menos 1h almoço)
          entry_type: 'CLOCK_OUT',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
      ];

      const summary = calculateTimesheetSummary({
        entries: overtimeEntries,
      });

      expect(summary.totalWorkedHours).toBe(10);
      expect(summary.regularHours).toBe(8);
      expect(summary.overtimeHours).toBe(2); // 2h de hora extra (>8h)
    });

    test('Calcula jornada de sábado: até 4h normais e o excedente como horas extras', () => {
      // Sábado 2026-08-15: trabalhou das 08:00 às 14:00 (6 horas)
      const saturdayEntries: StoredTimeEntry[] = [
        {
          id: 'sat1',
          user_id: 'u1',
          timestamp: '2026-08-15T08:00:00Z', // Sábado
          entry_type: 'CLOCK_IN',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: 'sat2',
          user_id: 'u1',
          timestamp: '2026-08-15T14:00:00Z',
          entry_type: 'CLOCK_OUT',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
      ];

      const summary = calculateTimesheetSummary({
        entries: saturdayEntries,
      });

      expect(summary.totalWorkedHours).toBe(6);
      expect(summary.regularHours).toBe(4); // Limite de 4h normais no sábado
      expect(summary.overtimeHours).toBe(2); // 2h de hora extra no sábado (>4h)
    });

    test('Consolida semana CLT completa de 44h sem horas extras', () => {
      const fullWeekEntries: StoredTimeEntry[] = [
        // Seg a Sex: 8h cada (08h às 17h com 1h intervalo) = 40h
        ...['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'].flatMap((date, idx) => [
          {
            id: `in-${idx}`,
            user_id: 'u1',
            timestamp: `${date}T08:00:00Z`,
            entry_type: 'CLOCK_IN' as const,
            latitude: null,
            longitude: null,
            gps_status: 'OK' as const,
            is_outside_hq: false,
          },
          {
            id: `ms-${idx}`,
            user_id: 'u1',
            timestamp: `${date}T12:00:00Z`,
            entry_type: 'MEAL_START' as const,
            latitude: null,
            longitude: null,
            gps_status: 'OK' as const,
            is_outside_hq: false,
          },
          {
            id: `me-${idx}`,
            user_id: 'u1',
            timestamp: `${date}T13:00:00Z`,
            entry_type: 'MEAL_END' as const,
            latitude: null,
            longitude: null,
            gps_status: 'OK' as const,
            is_outside_hq: false,
          },
          {
            id: `out-${idx}`,
            user_id: 'u1',
            timestamp: `${date}T17:00:00Z`,
            entry_type: 'CLOCK_OUT' as const,
            latitude: null,
            longitude: null,
            gps_status: 'OK' as const,
            is_outside_hq: false,
          },
        ]),
        // Sábado 2026-08-15: 4h (08h às 12h) = 4h
        {
          id: 'sat-in',
          user_id: 'u1',
          timestamp: '2026-08-15T08:00:00Z',
          entry_type: 'CLOCK_IN',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
        {
          id: 'sat-out',
          user_id: 'u1',
          timestamp: '2026-08-15T12:00:00Z',
          entry_type: 'CLOCK_OUT',
          latitude: null,
          longitude: null,
          gps_status: 'OK',
          is_outside_hq: false,
        },
      ];

      const summary = calculateTimesheetSummary({
        entries: fullWeekEntries,
      });

      expect(summary.totalWorkedHours).toBe(44);
      expect(summary.regularHours).toBe(44); // 40h (seg-sex) + 4h (sáb) = 44h normais
      expect(summary.overtimeHours).toBe(0);
    });

    test('Aplica valores customizados em centavos de viagens e técnicas reais', () => {
      const summary = calculateTimesheetSummary({
        entries: mockWeekdayEntries,
        customTechniquesCentavos: 45000, // R$ 450,00 reais do DB
        customTravelCentavos: 90000, // R$ 900,00 reais do DB
      });

      expect(summary.totalTechniquesCentavos).toBe(45000);
      expect(summary.totalTravelCentavos).toBe(90000);
      expect(summary.grandTotalBonusCentavos).toBe(135000);
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
