import { sanitizeAddressQuery, searchAddressCoordinates } from '../src/lib/geocoding';

describe('Módulo de Geocodificação de Endereços (Ticket 02)', () => {
  describe('Sanitização de busca de endereço', () => {
    test('Limpa espaços extras e caracteres vazios', () => {
      expect(sanitizeAddressQuery('  Av. Paulista,  1000   São Paulo  ')).toBe('Av. Paulista, 1000 São Paulo');
      expect(sanitizeAddressQuery('')).toBe('');
    });
  });

  describe('Busca de Coordenadas com Fallback seguro', () => {
    test('Retorna lista vazia para consultas muito curtas sem fazer request', async () => {
      const results = await searchAddressCoordinates('a');
      expect(results).toEqual([]);
    });

    test('Lida com falha de rede graciosamente retornando array vazio', async () => {
      // Mock global fetch para simular erro de rede
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const results = await searchAddressCoordinates('Rua Teste 123');
      expect(results).toEqual([]);

      global.fetch = originalFetch;
    });
  });
});
