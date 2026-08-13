import { calculateDistanceMeters, isOutsideRadius } from '../src/lib/geofence';

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
});
