import {
  formatDateBR,
  formatDateTimeBR,
  formatTimeBR,
  normalizeDateStr,
  getTodayDateStr,
} from '../src/lib/date-utils';

describe('Utilitários de Data Brasileiras (date-utils)', () => {
  describe('formatDateBR', () => {
    test('Formata corretamente string YYYY-MM-DD', () => {
      expect(formatDateBR('2026-08-13')).toBe('13/08/2026');
      expect(formatDateBR('2025-01-05')).toBe('05/01/2025');
      expect(formatDateBR('2024-12-31')).toBe('31/12/2024');
    });

    test('Formata corretamente ISO string sem quebrar ou dar Invalid Date', () => {
      expect(formatDateBR('2026-08-13T00:00:00.000Z')).toBe('13/08/2026');
      expect(formatDateBR('2026-08-13T15:30:00.000Z')).toBe('13/08/2026');
      expect(formatDateBR('2026-08-13T03:00:00.000Z')).toBe('13/08/2026');
    });

    test('Trata valores nulos, vazios ou inválidos sem lançar exceção', () => {
      expect(formatDateBR(null)).toBe('-');
      expect(formatDateBR(undefined)).toBe('-');
      expect(formatDateBR('')).toBe('-');
      expect(formatDateBR('texto-invalido')).toBe('-');
      expect(formatDateBR(null, 'N/D')).toBe('N/D');
    });
  });

  describe('normalizeDateStr', () => {
    test('Normaliza strings para YYYY-MM-DD puro', () => {
      expect(normalizeDateStr('2026-08-13')).toBe('2026-08-13');
      expect(normalizeDateStr('2026-08-13T00:00:00.000Z')).toBe('2026-08-13');
      expect(normalizeDateStr('  2026-08-13  ')).toBe('2026-08-13');
    });

    test('Retorna string vazia para entradas inválidas', () => {
      expect(normalizeDateStr(null)).toBe('');
      expect(normalizeDateStr(undefined)).toBe('');
      expect(normalizeDateStr('abc')).toBe('');
    });
  });

  describe('getTodayDateStr', () => {
    test('Retorna formato YYYY-MM-DD válido', () => {
      const today = getTodayDateStr();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateTimeBR e formatTimeBR', () => {
    test('Formata horário com segurança', () => {
      expect(formatTimeBR('2026-08-13T14:30:00.000Z')).toMatch(/\d{2}:\d{2}/);
      expect(formatTimeBR(null)).toBe('--:--');
    });
  });
});
