# SPEC — Technical Specification: EventPoint

> **Documento 3 de 4 do Planejamento de Produto Digital**
> Especificação técnica diretamente implementável para os agentes de código.

---

## 1. Visão Técnica Geral

### 1.1 Diagrama de Arquitetura ASCII

```
┌────────────────────────────────────────────────────────┐
│                   CLIENTES (FRONTEND)                  │
│                                                        │
│   [Mobile PWA - Funcionários]   [Admin Web - Dono]     │
│   React / Tailwind / MediaRec   React / Tailwind / Chart │
└───────────┬─────────────────────────┬──────────────────┘
            │ HTTPS / JSON            │ HTTPS / JSON
            ▼                         ▼
┌────────────────────────────────────────────────────────┐
│             CAMADA DE APLICAÇÃO (NEXT.JS 14+)          │
│                                                        │
│  ├── /app/api/auth (Login por CPF/Senha & Middleware)  │
│  ├── /app/api/ponto (Clock In/Out, GPS & Validation)   │
│  ├── /app/api/audio (Upload & OpenAI Whisper Proxy)    │
│  ├── /app/api/frota (Retirada & Devolução de Veículos) │
│  ├── /app/api/viagens (Diárias de R$ 150/dia)          │
│  └── /app/api/relatorios (Espelho PDF & Export XLSX)   │
└───────────┬─────────────────────────┬──────────────┬───┘
            │ SQL Queries             │ Audio Storage│ Transcribe
            ▼                         ▼              ▼
┌───────────────────────┐ ┌────────────────┐ ┌─────────────┐
│  PostgreSQL Database  │ │    Storage     │ │ OpenAI API  │
│  (Supabase / Neon)    │ │ (Audio Files)  │ │  (Whisper)  │
└───────────────────────┘ └────────────────┘ └─────────────┘
```

### 1.2 Convenções Globais

| Aspecto | Convenção |
|---------|-----------|
| Linguagem / Versão | TypeScript 5.0+ / Node.js 20+ |
| Framework | Next.js 14+ (App Router) |
| Estilo de Código | Standard JS / ESLint + Prettier |
| Nomes de Arquivo | `kebab-case.ts` / `kebab-case.tsx` |
| Formato de IDs | UUID v4 em string (`gen_random_uuid()`) |
| Timestamps | ISO 8601 UTC (`TIMESTAMPTZ` / `toISOString()`) |
| Manipulação de Moeda | Inteiro em Centavos (ex: R$ 150,00 = `15000`) |

---

## 2. ADRs — Architecture Decision Records

### ADR-01: Next.js App Router + PWA como Base Única

- **Contexto**: O sistema precisa rodar no smartphone dos funcionários de campo e em telas de desktop para o Dono.
- **Decisão**: Adotar Next.js 14 (App Router) com biblioteca `next-pwa` para compilar o PWA mobile e o painel Admin na mesma estrutura.
- **Consequências**: Elimina o custo de manter repositórios separados para mobile e web. O agente NÃO deve criar apps React Native ou Flutter separados.

### ADR-02: PostgreSQL com Supabase para Banco e Auth

- **Contexto**: Necessidade de integridade relacional rígida para registros de ponto, auditoria e autenticação por CPF.
- **Decisão**: Utilizar PostgreSQL rodando no Supabase com suporte a RLS (Row Level Security) e tabelas estruturadas.
- **Consequências**: Todas as tabelas devem possuir restrições de integridade (`FOREIGN KEY`, `CHECK constraints`).

### ADR-03: Processamento de Áudio com OpenAI Whisper API

- **Contexto**: Os funcionários gravam relatos em áudio que devem ser convertidos em texto para o Dono.
- **Decisão**: Utilizar a API oficial do OpenAI Whisper (`audio/transcriptions`) no backend Next.js.
- **Consequências**: O frontend faz upload do arquivo de áudio para o endpoint `/api/audio/transcribe`, que atua como proxy seguro com a API Key da OpenAI.

---

## 3. Estrutura do Projeto

```
eventpoint/
├── package.json                 # Dependências e scripts de build
├── next.config.mjs              # Configuração do Next.js e PWA
├── tsconfig.json                # Configurações do TypeScript
├── public/                      # Ícones PWA e manifesto
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Rotas de Login
│   │   │   └── login/page.tsx
│   │   ├── (funcionario)/       # Interface Mobile do Funcionário
│   │   │   ├── ponto/page.tsx
│   │   │   ├── frota/page.tsx
│   │   │   └── viagens/page.tsx
│   │   ├── (admin)/             # Interface Desktop do Dono
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── relatos/page.tsx
│   │   │   ├── frota/page.tsx
│   │   │   └── ponto/page.tsx
│   │   └── api/                 # Endpoints REST (Route Handlers)
│   │       ├── auth/route.ts
│   │       ├── ponto/route.ts
│   │       ├── audio/route.ts
│   │       ├── frota/route.ts
│   │       └── viagens/route.ts
│   ├── lib/                     # Utilitários e serviços compartilhados
│   │   ├── db.ts                # Cliente do PostgreSQL / Supabase
│   │   ├── whisper.ts           # Cliente de Integração com OpenAI API
│   │   ├── pdf-generator.ts     # Gerador de Espelho de Ponto em PDF
│   │   └── constants.ts         # Constantes do sistema
│   └── types/                   # Definições de Tipos TypeScript
│       └── index.ts
└── tests/                       # Testes de integração e unitários
```

---

## 4. Constantes Globais

```typescript
// src/lib/constants.ts

export const DAILY_TRAVEL_ALLOWANCE_CENTAVOS = 15000; // R$ 150,00
export const MAX_AUDIO_DURATION_SECONDS = 120; // 2 minutos
export const DEFAULT_TOLERANCE_MINUTES = 15; // 15 minutos de tolerância no ponto
export const OVERTIME_PERCENTAGE_SUNDAY_HOLIDAY = 100; // 100% de hora extra

export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-me',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
```

---

## 5. Especificação de Tipos TypeScript

```typescript
// src/types/index.ts

export type UserRole = 'EMPLOYEE' | 'ADMIN';

export interface User {
  id: string;
  cpf: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type TimeEntryType = 'CLOCK_IN' | 'MEAL_START' | 'MEAL_END' | 'CLOCK_OUT';
export type GpsStatus = 'OK' | 'UNAVAILABLE';

export interface TimeEntry {
  id: string;
  userId: string;
  entryType: TimeEntryType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gpsStatus: GpsStatus;
  isAdjusted: boolean;
  adjustmentReason?: string;
}

export interface AudioDiary {
  id: string;
  timeEntryId: string;
  audioUrl: string | null;
  transcriptionText: string;
  isFallbackText: boolean;
  fallbackReason?: string;
  durationSeconds: number;
}

export type VehicleStatus = 'GARAGE' | 'ON_ROAD' | 'TRIP';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
}
```

---

## 6. Modelagem de Dados SQL

```sql
-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(11) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('EMPLOYEE', 'ADMIN')),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Batidas de Ponto
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CLOCK_IN', 'MEAL_START', 'MEAL_END', 'CLOCK_OUT')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    gps_status VARCHAR(20) NOT NULL DEFAULT 'OK' CHECK (gps_status IN ('OK', 'UNAVAILABLE')),
    is_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    adjusted_by UUID REFERENCES users(id),
    adjustment_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Áudios e Relatos
CREATE TABLE audio_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id UUID NOT NULL UNIQUE REFERENCES time_entries(id) ON DELETE CASCADE,
    audio_url TEXT,
    transcription_text TEXT NOT NULL,
    is_fallback_text BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_reason TEXT,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Veículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    plate VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'GARAGE' CHECK (status IN ('GARAGE', 'ON_ROAD', 'TRIP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Usos de Veículos
CREATE TABLE vehicle_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    user_id UUID NOT NULL REFERENCES users(id),
    picked_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_USE' CHECK (status IN ('IN_USE', 'RETURNED', 'ON_TRIP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Observações / Alertas de Manutenção de Veículo
CREATE TABLE vehicle_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL CHECK (category IN ('OIL', 'BRAKES', 'TIRES', 'LIGHTS', 'GENERAL')),
    note_text TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Configurações da Empresa (Sede e Geofencing)
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hq_name VARCHAR(255) NOT NULL DEFAULT 'Sede Principal',
    hq_latitude NUMERIC(10, 8),
    hq_longitude NUMERIC(11, 8),
    hq_radius_meters INT NOT NULL DEFAULT 500,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Serviços de Técnica de Evento (R$ 150/Técnica/Dia)
CREATE TABLE event_technique_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    techniques_count INT NOT NULL DEFAULT 1 CHECK (techniques_count > 0),
    amount_per_technique_centavos INT NOT NULL DEFAULT 15000, -- R$ 150,00
    total_amount_centavos INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX idx_time_entries_user_timestamp ON time_entries(user_id, timestamp DESC);
CREATE INDEX idx_vehicle_usages_status ON vehicle_usages(status);
CREATE INDEX idx_vehicle_notes_vehicle ON vehicle_notes(vehicle_id, is_resolved);
CREATE INDEX idx_technique_services_user_date ON event_technique_services(user_id, service_date DESC);
```

---

## 7. Invariantes e Regras de Negócio do Domínio

```
INV-01: [Invariante]
  Descrição: Todo ponto de saída (CLOCK_OUT) deve obrigatoriamente possuir um registro correspondente na tabela audio_diaries.
  Verificar em: Banco de dados e API /api/ponto.

INV-02: [Validação]
  Descrição: Não é possível registrar CLOCK_IN se o usuário já possui um CLOCK_IN ativo no mesmo dia sem CLOCK_OUT correspondente.
  Verificar em: /api/ponto (Route Handler).

INV-03: [Transição de Estado]
  Descrição: Ao registrar a devolução de um veículo (vehicle_usage), o status do veículo na tabela vehicles deve transitar obrigatoriamente de ON_ROAD para GARAGE.
  Verificar em: /api/frota.

INV-04: [Autorização]
  Descrição: Apenas usuários com role = 'ADMIN' podem realizar ajustes manuais de horários ou alterar valores de diárias.
  Verificar em: Middleware de autorização JWT.
```

---

## 8. Sequência de Build (Passos de Implementação)

```
PASSO 1: Setup do Projeto e Infraestrutura
  - Inicializar Next.js 14 App Router com TypeScript e TailwindCSS.
  - Configurar biblioteca PWA e criar manifest.json.
  - Checkpoint: `npm run build` executa sem erros.

PASSO 2: Banco de Dados e Migrações SQL
  - Criar tabelas PostgreSQL (users, time_entries, audio_diaries, vehicles, vehicle_usages).
  - Checkpoint: Script DDL roda limpo no Supabase/PostgreSQL e cria índices.

PASSO 3: Autenticação por CPF e Senha
  - Criar rota /api/auth e formulário de login mobile.
  - Checkpoint: Login gera JWT com role do usuário e salva em Cookie seguro.

PASSO 4: Módulo de Ponto com GPS e Upload de Áudio
  - Criar interface mobile do ponto e integração com Geolocation API.
  - Criar integração backend com OpenAI Whisper API (/api/audio).
  - Checkpoint: Batida de saída envia áudio, grava no banco e gera texto transcrito.

PASSO 5: Módulo de Frota e Diárias de Viagem
  - Criar telas de Retirada/Devolução de Veículos e cálculo de diárias (R$ 150/dia).
  - Checkpoint: Veículo retirado altera status para ON_ROAD e devolvido volta para GARAGE.

PASSO 6: Painel Administrativo do Dono e Exportação
  - Criar Dashboard Ao Vivo, Feed de Áudios e emissão de PDF (Espelho de Ponto).
  - Checkpoint: Dono consegue ver alertas, ouvir áudio e emitir PDF com totais do mês.
```

---

## 9. Diagramas de Sequência (ASCII)

### SEQ-01: Fluxo de Registro de Saída com Áudio

```
Funcionário (PWA)           Next.js API (/api/audio)        OpenAI Whisper        PostgreSQL
       │                              │                           │                   │
       │─ 1. Envia Áudio + Geoloc ───>│                           │                   │
       │                              │─ 2. Proxy do Áudio ──────>│                   │
       │                              │                           │                   │
       │                              │<─ 3. Retorna Texto ───────│                   │
       │                              │                                               │
       │                              │─ 4. Salva Ponto + Transcrição ───────────────>│
       │                              │<─ 5. Confirma Gravação ───────────────────────│
       │                              │                                               │
       │<─ 6. Retorna Confirmação ────│                                               │
```

---

📄 **O arquivo `docs/spec.md` foi gerado e salvo com sucesso.**

Deseja prosseguir para a etapa final: a geração do **CLAUDE.md / AGENTS.md** para direcionar os agentes de IA na implementação do código?
