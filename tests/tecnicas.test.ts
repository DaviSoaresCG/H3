import {
  validateCreateTechnique,
  calculateTechniquesTotal,
} from '../src/lib/technique-validator';
import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '../src/lib/constants';

describe('Módulo de Adicional de Serviços de Técnica em Eventos (Issue #7)', () => {
  describe('Cálculo de Adicional de Técnicas (R$ 150/unidade)', () => {
    test('Calcula o valor correto para 1, 2, 4 técnicas', () => {
      expect(calculateTechniquesTotal(1)).toBe(15000); // R$ 150,00
      expect(calculateTechniquesTotal(2)).toBe(30000); // R$ 300,00
      expect(calculateTechniquesTotal(4)).toBe(60000); // R$ 600,00
    });

    test('Retorna 0 para quantidade zerada ou negativa', () => {
      expect(calculateTechniquesTotal(0)).toBe(0);
      expect(calculateTechniquesTotal(-1)).toBe(0);
    });

    test('Permite valor customizado de diária se especificado', () => {
      expect(calculateTechniquesTotal(2, 20000)).toBe(40000);
    });
  });

  describe('Validação de Criação de Registro de Técnica', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    test('Valida com sucesso dados corretos de técnica no dia do evento', () => {
      const result = validateCreateTechnique({
        eventName: 'Casamento no Buffet França',
        serviceDate: todayStr,
        techniquesCount: 2,
      });

      expect(result.valid).toBe(true);
    });

    test('Valida com sucesso evento realizado no passado recente', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const result = validateCreateTechnique({
        eventName: 'Show Corporativo',
        serviceDate: pastDateStr,
        techniquesCount: 1,
      });

      expect(result.valid).toBe(true);
    });

    test('Rejeita registro sem nome do evento', () => {
      const result = validateCreateTechnique({
        eventName: '   ',
        serviceDate: todayStr,
        techniquesCount: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Nome do evento');
    });

    test('Rejeita quantidade inválida (menor que 1)', () => {
      const resultZero = validateCreateTechnique({
        eventName: 'Show Corporativo',
        serviceDate: todayStr,
        techniquesCount: 0,
      });
      expect(resultZero.valid).toBe(false);
      expect(resultZero.error).toContain('Quantidade inválida');

      const resultNeg = validateCreateTechnique({
        eventName: 'Show Corporativo',
        serviceDate: todayStr,
        techniquesCount: -2,
      });
      expect(resultNeg.valid).toBe(false);
      expect(resultNeg.error).toContain('Quantidade inválida');
    });

    test('Rejeita data futura (amanhã em diante)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const result = validateCreateTechnique({
        eventName: 'Festival Futuro',
        serviceDate: tomorrowStr,
        techniquesCount: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Data futura');
    });
  });
});
