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
