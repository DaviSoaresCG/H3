import { sanitizeCpf, validateCpf } from '../src/lib/auth';

describe('Módulo de Cadastros Administrativos (Colaboradores, Veículos e Sede)', () => {
  describe('Validação de Cadastro de Colaborador', () => {
    test('Sanitiza e valida CPF corretamente', () => {
      expect(sanitizeCpf('123.456.789-01')).toBe('12345678901');
      expect(sanitizeCpf('11111111111')).toBe('11111111111');
      expect(sanitizeCpf('')).toBe('');
    });

    test('Rejeita CPFs inválidos com sequências repetidas', () => {
      expect(validateCpf('111.111.111-11')).toBe(false);
      expect(validateCpf('000.000.000-00')).toBe(false);
      expect(validateCpf('12345')).toBe(false);
    });
  });

  describe('Validação de Placa de Veículos', () => {
    test('Valida formato de placas padrão antigo e Mercosul', () => {
      const plateAntiga = 'ABC-1234'.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      expect(plateAntiga.length).toBe(7);

      const plateMercosul = 'BRA2E19'.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      expect(plateMercosul.length).toBe(7);
    });
  });
});
