/**
 * Calcula a distância em metros entre duas coordenadas geográficas (Latitude e Longitude)
 * utilizando a fórmula de Haversine.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const rad = Math.PI / 180;
  
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distância em metros
}

/**
 * Verifica se a localização informada está fora do raio permitido da sede
 */
export function isOutsideRadius(
  userLat: number | null,
  userLon: number | null,
  hqLat: number | null,
  hqLon: number | null,
  maxRadiusMeters: number
): boolean {
  if (userLat === null || userLon === null || hqLat === null || hqLon === null) {
    return false; // Não marca como fora do raio se faltar coordenada da sede
  }
  
  const distance = calculateDistanceMeters(userLat, userLon, hqLat, hqLon);
  return distance > maxRadiusMeters;
}

/**
 * Valida se as coordenadas de latitude e longitude estão nos intervalos aceitáveis da Terra.
 */
export function validateCoordinates(
  lat: number,
  lon: number
): { valid: boolean; error?: string } {
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    return {
      valid: false,
      error: 'Latitude inválida. O valor deve ser um número entre -90 e 90.',
    };
  }

  if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
    return {
      valid: false,
      error: 'Longitude inválida. O valor deve ser um número entre -180 e 180.',
    };
  }

  return { valid: true };
}

/**
 * Faz parse inteligente de uma string de coordenadas ou URL do Google Maps.
 * Suporta formatos:
 * - "-23.550520, -46.633308"
 * - "-23,550520; -46,633308" (padrão vírgula brasileira)
 * - "https://www.google.com/maps?q=-23.550520,-46.633308"
 * - "https://www.google.com/maps/place/.../@-23.550520,-46.633308,17z/..."
 */
export function parseCoordinatesInput(
  input: string
): { latitude: number; longitude: number } | null {
  if (!input || typeof input !== 'string') return null;
  const text = input.trim();

  // 1. Extração de URL do Google Maps com @lat,lon
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lon = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon };
    }
  }

  // 2. Extração de URL do Google Maps com ?q=lat,lon ou &q=lat,lon ou ll=lat,lon
  const qMatch = text.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lon = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon };
    }
  }

  // 3. Formato com separador ponto-e-vírgula ou barra ou espaço e vírgula decimal brasileira (-23,55; -46,63)
  if (text.includes(';') || text.includes('/') || (text.match(/,/g) || []).length >= 2) {
    const parts = text.split(/[;/|]/).map((p) => p.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].replace(',', '.'));
      const lon = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(lat) && !isNaN(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }
  }

  // 4. Formato tradicional com vírgula ou espaço simples: "-23.550520, -46.633308" ou "-23.550520 -46.633308"
  const pairMatch = text.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lon = parseFloat(pairMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon };
    }
  }

  return null;
}
