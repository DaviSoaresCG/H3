export const DAILY_TRAVEL_ALLOWANCE_CENTAVOS = 15000; // R$ 150,00 por dia de viagem
export const TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS = 15000; // R$ 150,00 por técnica em evento/dia
export const MAX_AUDIO_DURATION_SECONDS = 120; // 2 minutos máximo de gravação
export const DEFAULT_TOLERANCE_MINUTES = 15; // 15 min de tolerância de atraso
export const DEFAULT_HQ_RADIUS_METERS = 500; // 500 metros de raio da sede da empresa

export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-eventpoint-2026',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
