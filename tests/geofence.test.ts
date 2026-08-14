import {
  calculateDistanceMeters,
  isOutsideRadius,
  parseCoordinatesInput,
  validateCoordinates,
} from '../src/lib/geofence';

describe('Módulo de Geofencing e Cálculo de GPS', () => {
  // Coordenadas da Sede (Avenida Paulista, São Paulo)
  const hqLat = -23.561684;
  const hqLon = -46.655981;

  test('Calcula distância zero para coordenadas idênticas', () => {
    const distance = calculateDistanceMeters(hqLat, hqLon, hqLat, hqLon);
    expect(distance).toBeLessThan(1); // < 1 metro
  });

  test('Calcula distância aproximada correta entre dois pontos conhecidos', () => {
    // Ponto a ~1.2 km de distância na Paulista
    const userLat = -23.571684;
    const userLon = -46.645981;

    const distance = calculateDistanceMeters(hqLat, hqLon, userLat, userLon);
    expect(distance).toBeGreaterThan(1000); // > 1 km
    expect(distance).toBeLessThan(2000); // < 2 km
  });

  test('isOutsideRadius identifica batida de entrada dentro do raio da sede (<= 500m)', () => {
    // Ponto a ~100 metros da sede
    const nearLat = -23.562000;
    const nearLon = -46.656000;

    const isOutside = isOutsideRadius(nearLat, nearLon, hqLat, hqLon, 500);
    expect(isOutside).toBe(false);
  });

  test('isOutsideRadius sinaliza anomalia se a entrada for a mais de 500m da sede', () => {
    // Ponto a 12 km de distância
    const farLat = -23.650000;
    const farLon = -46.700000;

    const isOutside = isOutsideRadius(farLat, farLon, hqLat, hqLon, 500);
    expect(isOutside).toBe(true);
  });

  test('Retorna false graciosamente se as coordenadas forem nulas', () => {
    expect(isOutsideRadius(null, null, hqLat, hqLon, 500)).toBe(false);
  });

  describe('Parseamento Inteligente e Validação de Coordenadas (Ticket 01)', () => {
    test('Extrai latitude e longitude de string com vírgula padrão', () => {
      const parsed = parseCoordinatesInput('-23.550520, -46.633308');
      expect(parsed).toEqual({ latitude: -23.55052, longitude: -46.633308 });
    });

    test('Extrai coordenadas com vírgula como separador decimal brasileiro', () => {
      const parsed = parseCoordinatesInput('-23,550520; -46,633308');
      expect(parsed).toEqual({ latitude: -23.55052, longitude: -46.633308 });
    });

    test('Extrai coordenadas de link do Google Maps com query param ?q=', () => {
      const parsed = parseCoordinatesInput('https://www.google.com/maps?q=-23.550520,-46.633308');
      expect(parsed).toEqual({ latitude: -23.55052, longitude: -46.633308 });
    });

    test('Extrai coordenadas de link do Google Maps com @lat,lon', () => {
      const parsed = parseCoordinatesInput('https://www.google.com/maps/place/Sede/@-23.550520,-46.633308,17z/data=...');
      expect(parsed).toEqual({ latitude: -23.55052, longitude: -46.633308 });
    });

    test('Valida coordenadas dentro do intervalo aceitável', () => {
      expect(validateCoordinates(-23.55, -46.63)).toEqual({ valid: true });
      expect(validateCoordinates(0, 0)).toEqual({ valid: true });
      expect(validateCoordinates(-95, -46.63).valid).toBe(false);
      expect(validateCoordinates(-23.55, 200).valid).toBe(false);
      expect(validateCoordinates(NaN, -46.63).valid).toBe(false);
    });
  });
});
