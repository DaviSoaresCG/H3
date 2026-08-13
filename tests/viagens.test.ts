import {
  calculateTripDays,
  calculateTripAllowance,
  validateCreateTrip,
  determineTripStatus,
} from '../src/lib/trip-validator';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '../src/lib/constants';

describe('Módulo de Gestão de Viagens e Diárias de Viagem (Issue #6)', () => {
  describe('Cálculo de Dias e Diárias de Viagem (R$ 150/dia)', () => {
    test('Calcula corretamente o número de dias inclusivos entre datas', () => {
      // De 10 a 12 = 3 dias (10, 11, 12)
      expect(calculateTripDays('2026-08-10', '2026-08-12')).toBe(3);
      // Mesmo dia = 1 dia
      expect(calculateTripDays('2026-08-10', '2026-08-10')).toBe(1);
    });

    test('Lança erro se a data final for anterior à data inicial', () => {
      expect(() => calculateTripDays('2026-08-15', '2026-08-10')).toThrow('Data inválida');
    });

    test('Calcula valor total da diária por funcionário (dias * 15000 centavos)', () => {
      const days = 3;
      const allowance = calculateTripAllowance(days, DAILY_TRAVEL_ALLOWANCE_CENTAVOS);
      expect(allowance).toBe(45000); // R$ 450,00

      const singleDayAllowance = calculateTripAllowance(1, DAILY_TRAVEL_ALLOWANCE_CENTAVOS);
      expect(singleDayAllowance).toBe(15000); // R$ 150,00
    });
  });

  describe('Validação de Criação de Viagem', () => {
    test('Valida com sucesso viagem com parâmetros corretos', () => {
      const result = validateCreateTrip({
        title: 'Montagem Festival de Verão',
        destinationCity: 'Campos do Jordão - SP',
        startDate: '2026-09-01',
        endDate: '2026-09-04',
        participantIds: ['user-1', 'user-2'],
        vehicleIds: ['veh-1'],
      });

      expect(result.valid).toBe(true);
      expect(result.daysCount).toBe(4);
    });

    test('Rejeita viagem com título ou cidade em branco', () => {
      const resultNoTitle = validateCreateTrip({
        title: '   ',
        destinationCity: 'Santos - SP',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        participantIds: ['user-1'],
      });
      expect(resultNoTitle.valid).toBe(false);
      expect(resultNoTitle.error).toContain('Título');

      const resultNoCity = validateCreateTrip({
        title: 'Show Sertanejo',
        destinationCity: '',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        participantIds: ['user-1'],
      });
      expect(resultNoCity.valid).toBe(false);
      expect(resultNoCity.error).toContain('Cidade de destino');
    });

    test('Rejeita viagem com data final anterior à inicial', () => {
      const result = validateCreateTrip({
        title: 'Evento Corporativo',
        destinationCity: 'Campinas - SP',
        startDate: '2026-09-10',
        endDate: '2026-09-05',
        participantIds: ['user-1'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Data inválida');
    });

    test('Rejeita viagem sem nenhum participante', () => {
      const result = validateCreateTrip({
        title: 'Entrega de Som',
        destinationCity: 'Sorocaba - SP',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        participantIds: [],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('pelo menos um funcionário');
    });
  });

  describe('Determinação de Status da Viagem', () => {
    test('Retorna status COMPLETED se explicitamente encerrada', () => {
      expect(determineTripStatus('2026-08-01', '2026-08-05', true)).toBe('COMPLETED');
      expect(determineTripStatus('2026-08-01', '2026-08-05', 'COMPLETED')).toBe('COMPLETED');
    });

    test('Retorna status CANCELLED se explicitamente cancelada', () => {
      expect(determineTripStatus('2026-08-01', '2026-08-05', 'CANCELLED')).toBe('CANCELLED');
    });

    test('Retorna status ACTIVE quando iniciada manualmente ou quando a data atual está no período', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(determineTripStatus(today, today, false)).toBe('ACTIVE');
      expect(determineTripStatus('2026-12-01', '2026-12-05', 'ACTIVE')).toBe('ACTIVE');
    });

    test('Retorna status PLANNED quando a data da viagem é futura e status é PLANNED', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const futureStr = future.toISOString().split('T')[0];

      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 12);
      const futureEndStr = futureEnd.toISOString().split('T')[0];

      expect(determineTripStatus(futureStr, futureEndStr, 'PLANNED')).toBe('PLANNED');
    });

    test('Transita automaticamente para ACTIVE quando a data do evento chega', () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Quando a viagem era prevista mas a data de início é hoje
      expect(determineTripStatus(today, tomorrowStr, 'PLANNED')).toBe('ACTIVE');
    });
  });
});
