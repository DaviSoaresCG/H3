-- Script de Inicialização DDL e Seeds para o EventPoint

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(11) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('EMPLOYEE', 'ADMIN')),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Configurações da Empresa (Sede e Geofence)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hq_name VARCHAR(255) NOT NULL DEFAULT 'Sede Principal',
    hq_latitude NUMERIC(10, 8),
    hq_longitude NUMERIC(11, 8),
    hq_radius_meters INT NOT NULL DEFAULT 500,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Batidas de Ponto
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CLOCK_IN', 'MEAL_START', 'MEAL_END', 'CLOCK_OUT')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    gps_status VARCHAR(20) NOT NULL DEFAULT 'OK' CHECK (gps_status IN ('OK', 'UNAVAILABLE')),
    is_outside_hq BOOLEAN NOT NULL DEFAULT FALSE,
    is_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    adjusted_by UUID REFERENCES users(id),
    adjustment_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Áudios e Relatos
CREATE TABLE IF NOT EXISTS audio_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id UUID NOT NULL UNIQUE REFERENCES time_entries(id) ON DELETE CASCADE,
    audio_url TEXT,
    transcription_text TEXT NOT NULL,
    is_fallback_text BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_reason TEXT,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Veículos
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    plate VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'GARAGE' CHECK (status IN ('GARAGE', 'ON_ROAD', 'TRIP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Usos de Veículos
CREATE TABLE IF NOT EXISTS vehicle_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    user_id UUID NOT NULL REFERENCES users(id),
    picked_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_USE' CHECK (status IN ('IN_USE', 'RETURNED', 'ON_TRIP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabela de Observações / Alertas de Manutenção de Veículo
CREATE TABLE IF NOT EXISTS vehicle_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL CHECK (category IN ('OIL', 'BRAKES', 'TIRES', 'LIGHTS', 'GENERAL')),
    note_text TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabela de Viagens
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    destination_city VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_allowance_centavos INT NOT NULL DEFAULT 15000,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.1 Participantes da Viagem
CREATE TABLE IF NOT EXISTS trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    days_count INT NOT NULL DEFAULT 1,
    total_allowance_centavos INT NOT NULL DEFAULT 15000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.2 Veículos da Viagem
CREATE TABLE IF NOT EXISTS trip_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabela de Serviços de Técnica de Evento (R$ 150/Técnica/Dia)
CREATE TABLE IF NOT EXISTS event_technique_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    techniques_count INT NOT NULL DEFAULT 1 CHECK (techniques_count > 0),
    amount_per_technique_centavos INT NOT NULL DEFAULT 15000,
    total_amount_centavos INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_time_entries_user_timestamp ON time_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_usages_status ON vehicle_usages(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_notes_vehicle ON vehicle_notes(vehicle_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_technique_services_user_date ON event_technique_services(user_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_vehicles_trip ON trip_vehicles(trip_id);

-- SEEDS INICIAIS (IDEMPOTENTES)

-- Usuários: Colaborador e Administrador
INSERT INTO users (id, cpf, name, phone, role, password_hash)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '11111111111', 'Carlos Montador', '(11) 99999-1111', 'EMPLOYEE', '$2a$10$owJJUL0t4WmPY/.7mgIxVuFPoVbz1pm5r9T0gmHsIpt./jnxBPSVW'),
  ('99999999-9999-9999-9999-999999999999', '99999999999', 'Roberto Dono', '(11) 98888-9999', 'ADMIN', '$2a$10$lFSADodP2N7nZ6Rlt7lJouAy0PfvniH3NzqbSgcyjjlq.0Oajuzi6')
ON CONFLICT (cpf) DO NOTHING;

-- Configuração da Empresa / Sede
INSERT INTO company_settings (id, hq_name, hq_latitude, hq_longitude, hq_radius_meters)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sede Principal EventPoint', -23.55052000, -46.63330800, 500)
ON CONFLICT (id) DO NOTHING;

-- Veículos da Frota
INSERT INTO vehicles (id, name, plate, status)
VALUES 
  ('11111111-2222-3333-4444-555555555551', 'Fiorino 01', 'ABC-1234', 'GARAGE'),
  ('11111111-2222-3333-4444-555555555552', 'Kangoo 02', 'XYZ-5678', 'GARAGE'),
  ('11111111-2222-3333-4444-555555555553', 'Master Caminhão 03', 'EVE-9999', 'GARAGE')
ON CONFLICT (plate) DO NOTHING;
