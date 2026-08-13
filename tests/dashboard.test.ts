import {
  calculateShiftDurationHours,
  detectShiftExceeded12h,
  detectOverdueVehicleUsage,
  categorizeAnomalyAlert,
} from '../src/lib/dashboard-aggregator';

describe('Módulo de Agregação de Métricas e Alertas do Dashboard Executivo (Issue #8)', () => {
  describe('Cálculo de Duração de Jornada e Alerta de 12 Horas', () => {
    test('Calcula duração correta da jornada em horas', () => {
      const start = '2026-08-13T08:00:00Z';
      const now = '2026-08-13T16:00:00Z';
      expect(calculateShiftDurationHours(start, now)).toBe(8);
    });

    test('Detecta jornada excedida quando tempo for maior que 12 horas', () => {
      const start = '2026-08-13T06:00:00Z';
      const now13h = '2026-08-13T19:30:00Z'; // 13.5h
      const now10h = '2026-08-13T16:00:00Z'; // 10h

      expect(detectShiftExceeded12h(start, now13h)).toBe(true);
      expect(detectShiftExceeded12h(start, now10h)).toBe(false);
    });
  });

  describe('Detecção de Atraso de Devolução de Veículo da Frota', () => {
    test('Identifica carro na rua há mais de 14 horas como em atraso', () => {
      const pickedUpAt = '2026-08-13T06:00:00Z';
      const now15h = '2026-08-13T21:00:00Z'; // 15h
      const now5h = '2026-08-13T11:00:00Z'; // 5h

      expect(detectOverdueVehicleUsage(pickedUpAt, now15h, 14)).toBe(true);
      expect(detectOverdueVehicleUsage(pickedUpAt, now5h, 14)).toBe(false);
    });
  });

  describe('Categorização de Alertas de Anomalias', () => {
    test('Categoriza anomalia de entrada fora da sede', () => {
      const alert = categorizeAnomalyAlert({
        isOutsideHq: true,
        gpsStatus: 'OK',
        shiftHours: 4,
      });

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('OUTSIDE_HQ');
      expect(alert?.severity).toBe('HIGH');
    });

    test('Categoriza anomalia de sinal GPS indisponível', () => {
      const alert = categorizeAnomalyAlert({
        isOutsideHq: false,
        gpsStatus: 'UNAVAILABLE',
        shiftHours: 4,
      });

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('NO_GPS');
      expect(alert?.severity).toBe('MEDIUM');
    });

    test('Categoriza anomalia de jornada sem saída superior a 12 horas', () => {
      const alert = categorizeAnomalyAlert({
        isOutsideHq: false,
        gpsStatus: 'OK',
        shiftHours: 13,
      });

      expect(alert).toBeDefined();
      expect(alert?.type).toBe('SHIFT_EXCEEDED_12H');
      expect(alert?.severity).toBe('CRITICAL');
    });

    test('Retorna null se não houver anomalias', () => {
      const alert = categorizeAnomalyAlert({
        isOutsideHq: false,
        gpsStatus: 'OK',
        shiftHours: 8,
      });

      expect(alert).toBeNull();
    });
  });
});
