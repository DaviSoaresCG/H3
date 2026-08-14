export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Normaliza termos de busca de endereço ou CEP para geocodificação
 */
export function sanitizeAddressQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Faz requisição ao serviço de geocodificação OpenStreetMap (Nominatim)
 */
export async function searchAddressCoordinates(
  query: string
): Promise<GeocodeResult[]> {
  const sanitized = sanitizeAddressQuery(query);
  if (!sanitized || sanitized.length < 3) {
    return [];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      sanitized
    )}&limit=5&countrycodes=br&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EventPoint-App/1.0 (logistica@eventpoint.com.br)',
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('[Geocode Search Error]:', error);
    return [];
  }
}
