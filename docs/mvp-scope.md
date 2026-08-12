# MVP Scope — EventPoint (Gestão de Ponto, Frota e Relatos por Áudio)

> **Documento 1 de 4 do Planejamento de Produto Digital**
> Visão geral técnica, estratégica e arquitetura do MVP.

---

## 1. Visão Geral do Produto

- **Nome do Produto**: **EventPoint** (nome de trabalho)
- **Tagline**: *Gestão de Ponto, Frota e Diário de bordo por Áudio simplificada para empresas de locação de eventos.*
- **Descrição**: O EventPoint é um sistema web responsivo (PWA) e painel administrativo desenvolvido para empresas de locação de equipamentos de eventos. Permite que funcionários registrem o ponto pelo celular com captura de GPS, gravem relatos diários por áudio no encerramento do expediente (transcritos automaticamente via Inteligência Artificial) e gerenciem a retirada e devolução de veículos da frota na garagem da empresa. O dono possui um painel administrativo orientado a exceções com alertas em tempo real, diárias de viagem (R$ 150,00/dia), bônus de domingos/feriados e exportação de espelho de ponto em PDF e Excel.
- **Problema que Resolve**: Empresas de logística e locação de equipamentos para eventos enfrentam descontrole sobre horários de trabalho em campo, perda de histórico sobre o que foi realizado nos eventos, informalidade na retirada/devolução de veículos da empresa e dificuldade no cálculo mensal de diárias de viagem e domingos/feriados.
- **Proposta de Valor Central**: Eliminar o atrito de digitação no fim do expediente via relatos por áudio com transcrição IA, centralizar o controle de frota vinculado às jornadas e oferecer ao dono uma visão executiva e conclusiva para tomada de decisão e fechamento de folha em poucos cliques.

---

## 2. Pesquisa de Mercado e Público-Alvo

### 2.1 Tamanho de Mercado
- **TAM (Total Addressable Market)**: Mercado de empresas de eventos, logística promocional e locação de estruturas/equipamentos no Brasil (estimado em +40.000 empresas).
- **SAM (Serviceable Addressable Market)**: Empresas de locação de móveis, som, iluminação e geradores para eventos de médio porte com equipes de campo (+8.000 empresas).
- **SOM (Serviceable Obtainable Market)**: 200 empresas de locação no primeiro ano de operação.

### 2.2 Tendências Relevantes
1. **Adoção de Speech-to-Text por IA no Trabalho Operacional**: Uso de modelos como Whisper para conversão rápida de voz em texto.
2. **Mobility-First em Equipes de Campo**: Uso de PWAs nos próprios smartphones de funcionários para dispensar relógios de ponto físicos caros.
3. **Compliance e Transparência em Diárias de Viagem**: Necessidade de histórico claro de deslocamentos para evitar passivos trabalhistas.

### 2.3 Mapa Competitivo

| Concorrente | Pontos Fortes | Lacunas | Posicionamento do EventPoint |
|-------------|---------------|---------|------------------------------|
| **PontoMais / Tangerino** | Reconhecido no mercado, regras trabalhistas genéricas. | Sem gestão de frota integrada, sem relatos por áudio por IA, complexo para eventos. | Foco vertical em locação de eventos, relatos de áudio e controle de frota simplificado. |
| **Cobli / Gestão de Frota** | Telemetria avançada via OBD/GPS no veículo. | Custo elevado por veículo, sem controle de ponto e diárias de funcionários. | Controle simples de retiradas/devoluções na garagem sem hardware veicular. |
| **Controle em Planilhas/WhatsApp** | Custo zero inicial, flexível. | Caótico, sem histórico consultável, perda de dados de voz, erro nos cálculos. | Automação acessível que substitui o caos dos grupos de WhatsApp por dados estruturados. |

### 2.4 Personas

#### Persona Primária (Operacional): **Carlos — Montador/Motorista de Eventos**
- **Idade**: 32 anos.
- **Contexto**: Trabalha na rua transportando e montando equipamentos de eventos. Usa smartphone Android próprio.
- **Dores**: Preguiça de preencher relatórios digitados no fim do dia exaustivo; esquece horários exatos de retirada de carros.
- **JTBD (Job To Be Done)**: Bater o ponto rapidamente pelo celular, gravar um áudio curto contando o que fez no dia e não ter complicação na devolução do veículo.

#### Persona Secundária (Gestão): **Roberto — Dono da Empresa de Locação**
- **Idade**: 48 anos.
- **Contexto**: Gestor ocupado que precisa acompanhar vários eventos simultâneos, frota na rua e fechamento financeiro no fim do mês.
- **Dores**: Medo de carros ficarem na rua sem controle, falta de clareza se os funcionários cumpriram o roteiro, demora no cálculo mensal de diárias de viagem e domingos/feriados.
- **JTBD**: Acessar o painel em tempo real, ver alertas de anomalias, ler os resumos das atividades dos funcionários e emitir a folha/diárias sem planilhas confusas.

---

## 3. Stack Tecnológica Recomendada

| Camada | Escolha | Alternativa | Trade-off / Justificativa |
|--------|---------|-------------|---------------------------|
| **Frontend Mobile & Admin** | **Next.js 14+ (App Router) + React + TailwindCSS (PWA)** | Vite + React SPA | Next.js oferece SSR/SSG rápido para o Painel Admin e PWA installable no mobile dos funcionários na mesma codebase. |
| **Backend / API** | **Next.js Route Handlers / Node.js** | Express / NestJS | Menos sobrecargas de infraestrutura em MVP; rotas de API severless escaláveis e de rápida implantação. |
| **Banco de Dados** | **PostgreSQL (via Supabase ou Neon)** | MongoDB | O PostgreSQL garante integridade relacional entre Usuários, Batidas de Ponto, Frota e Viagens, além de suporte nativo a RLS (Row Level Security). |
| **Processamento de Áudio (IA)** | **OpenAI Whisper API / Groq Whisper** | AssemblyAI | Transcrição em português do Brasil de altíssima precisão e baixo custo por minuto gravado. |
| **Storage de Áudios** | **Supabase Storage / AWS S3** | Cloudinary | Armazenamento de arquivos de áudio `.m4a`/`.mp3` seguros com URLs pré-assinadas. |
| **Autenticação** | **Supabase Auth / NextAuth.js** | Auth0 | Permite login simples por CPF/Telefone + Senha, mantendo o custo sob controle no MVP. |

---

## 4. APIs e Integrações Externas

| Serviço | Finalidade | Justificativa |
|---------|------------|---------------|
| **OpenAI Whisper API** | Transcrição de áudio em texto (Speech-to-Text) | Qualidade superior no reconhecimento de áudios em ambientes com ruído de fundo. |
| **OpenStreetMap / Nominatim (Geocoding)** | Conversão de Latitude/Longitude em endereço legível | Exibir para o Dono o endereço aproximado de onde o ponto foi batido. |
| **PDFKit / jsPDF** | Geração do Espelho de Ponto em PDF | Emissão de documentos formatados para impressão e assinatura dos funcionários. |
| **SheetJS (xlsx)** | Exportação de dados para Excel/CSV | Relatórios analíticos de horas, diárias e uso de frota. |

---

## 5. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  DISPOSITIVOS DOS USUÁRIOS              │
│                                                         │
│   [Smartphone Funcionário]        [Painel Admin Dono]   │
│       (PWA / Web App)              (Desktop / Tablet)   │
└───────────┬─────────────────────────────────┬───────────┘
            │ HTTPS / WebSockets              │ HTTPS
            ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS FULLSTACK FRAMEWORK           │
│                                                         │
│  ├── PWA Frontend Components (React + Tailwind)         │
│  └── API Route Handlers (Auth, Ponto, Frota, Viagens)   │
└───────────┬─────────────────────────┬───────────────┬───┘
            │ SQL Queries             │ Audio Upload  │ Transcribe
            ▼                         ▼               ▼
┌───────────────────────┐ ┌────────────────┐ ┌─────────────┐
│  PostgreSQL Database  │ │    Storage     │ │ OpenAI API  │
│  (Supabase / Neon)    │ │ (Audio Files)  │ │  (Whisper)  │
└───────────────────────┘ └────────────────┘ └─────────────┘
```

### Gargalos e Riscos Técnicos no MVP:
- **Rede Movel Fraca no Local do Evento**: O PWA deve armazenar a gravação de áudio em cache local (`IndexedDB`) e sincronizar com o servidor assim que a conexão for reestabelecida.
- **GPS Desativado no Smartphone**: Tratar graciosamente com fallback e registrar o ponto sinalizando o aviso *"GPS Indisponível"*.

---

## 6. Modelagem de Dados (Prévia)

### Entidades Principais:

1. **`users`**: Cadastro de funcionários e administrador (Dono).
   - `id`, `cpf`, `name`, `phone`, `role` (`EMPLOYEE` / `ADMIN`), `password_hash`, `created_at`.
2. **`vehicles`**: Cadastro da frota de veículos.
   - `id`, `name` (ex: "Fiorino 01"), `plate` (placa), `status` (`GARAGE` / `ON_ROAD` / `TRIP`), `created_at`.
3. **`time_entries`**: Registros de ponto dos funcionários.
   - `id`, `user_id`, `type` (`CLOCK_IN`, `MEAL_START`, `MEAL_END`, `CLOCK_OUT`), `timestamp`, `latitude`, `longitude`, `location_name`, `gps_status` (`OK` / `UNAVAILABLE`), `created_at`.
4. **`audio_diaries`**: Relatos por áudio do fim do expediente.
   - `id`, `time_entry_id` (vinculado ao CLOCK_OUT), `audio_url`, `transcription_text`, `is_fallback_text` (boolean), `duration_seconds`, `created_at`.
5. **`vehicle_usages`**: Registros de retirada e devolução de carros.
   - `id`, `vehicle_id`, `user_id`, `picked_up_at`, `returned_at`, `trip_id` (opcional), `status` (`IN_USE`, `RETURNED`), `created_at`.
6. **`trips`**: Agendamento de viagens e eventos fora da cidade.
   - `id`, `title`, `destination_city`, `start_date`, `end_date`, `daily_allowance_amount` (default: 150.00), `created_at`.
7. **`trip_participants`**: Associação de funcionários às viagens.
   - `id`, `trip_id`, `user_id`, `days_count`, `total_allowance`.

---

## 7. Regras de Negócio Centrais

1. **Validação de Saída com Áudio**: O ponto de saída (`CLOCK_OUT`) só pode ser finalizado após a gravação bem-sucedida do áudio (ou uso explícito do fallback em texto justificando a falha de microfone).
2. **Status de Frota em Viagem**: Quando um veículo está associado a uma `trip` ativa, seu status fica como `TRIP` e não gera alertas de "Atraso na Devolução Diária" até a data final prevista da viagem.
3. **Cálculo de Diárias de Viagem**: Contabiliza `R$ 150,00 * Dias em Viagem`. Permite ajuste manual do valor pelo Dono na tela de fechamento mensal.
4. **Regra de Domingos e Feriados**: Batidas em domingos/feriados podem ser marcadas para pagamento via **Diária Fixa (R$ X)** ou via **Horas Extras (100%)**, selecionável pelo Dono.
5. **Central de Alertas Críticos (Painel do Dono)**: Notifica ativamente sobre:
   - Carro em uso além do horário previsto.
   - Ponto de saída não registrado após 12h do ponto de entrada.
   - Ponto registrado com GPS indisponível.
   - Ponto registrado sem áudio anexado.

---

## 8. Monetização e Modelo de Negócio

- **Modelo**: B2B SaaS (Subscription per Active User / Vehicle).
- **Tier Recomendado MVP**:
  - **Plano Base**: R$ 199,00/mês (inclui até 10 funcionários e 3 veículos).
  - **Plano Crescimento**: R$ 349,00/mês (inclui até 25 funcionários e 8 veículos).
  - **Adicional**: R$ 15,00/mês por funcionário extra.
- **Conversão Free -> Pago**: 14 dias de teste grátis (Trial) completo.

---

## 9. Roadmap de Features

| Feature | Prioridade | Complexidade | Dependências |
|---------|------------|--------------|--------------|
| Login CPF + Bater Ponto Mobile (GPS) | Essencial MVP v1 | Baixa | Auth |
| Gravação de Áudio + Speech-to-Text Whisper | Essencial MVP v1 | Média | Storage & OpenAI API |
| Retirada e Devolução de Veículos na Garagem | Essencial MVP v1 | Baixa | Módulo de Frota |
| Gestão de Viagens (R$ 150/dia) e Domingos/Feriados | Essencial MVP v1 | Média | Time Entries |
| Painel do Dono com Alertas e Feed de Áudios | Essencial MVP v1 | Média | Frontend Admin |
| Emissão de Espelho de Ponto (PDF) e Excel | Essencial MVP v1 | Média | PDFKit / XLSX |
| Quiosque / Tablet Fixo com QR Code na Sede | Pós-MVP v2 | Média | Módulo QR Code |
| Checklist com Fotos de Avarias dos Veículos | Futuro v3 | Média | Storage Images |

---

## 10. Fora do Escopo do MVP

| Item | Motivo da Exclusão |
|------|--------------------|
| **Quiosque Tablet na Sede** | Adiado para a Fase 2 a pedido do cliente para priorizar o uso no smartphone dos funcionários. |
| **Reconhecimento Facial** | Aumentaria a complexidade e custos no MVP; o login por CPF/Senha + GPS atende a auditoria inicial. |
| **Checklist de Avarias/Combustível** | Mantido no modelo enxuto (apenas horários e motorista) para focar na adesão rápida da equipe. |
| **Integração Nativa com Relógio de Ponto Físico (REP)** | O sistema é 100% digital e móvel. |

---

## 11. Evolução da Arquitetura

- **Estágio 1 (MVP: 1 a 20 Empresas)**: Monolito modular Next.js rodando em Vercel / Render com PostgreSQL Supabase.
- **Estágio 2 (Escala: 100+ Empresas)**: Fila de mensagens (`Redis` / `BullMQ`) para processamento assíncrono de transcrição de áudios em background sem impactar a resposta da API do ponto.

---

## 12. Riscos e Pontos de Atenção

| Risco | Categoria | Impacto | Mitigação |
|-------|-----------|---------|-----------|
| **Falha de Transcrição do Áudio por Ruído** | Técnico | Médio | Manter sempre o player de áudio original para o Dono ouvir caso a transcrição falhe ou fique confusa. |
| **Resistência dos Funcionários em Gravar Áudio** | Operacional | Alto | Interface simples com um único botão vermelho "Gravar Relato Diário", com contagem regressiva de tempo (máx 2 minutos). |
| **Smartphones Antigos sem GPS Preciso** | Técnico | Baixo | Implementar o fallback de permissão de ponto com registro da flag *"GPS Indisponível"*. |

---

## Resumo Executivo

O **EventPoint** é uma solução vertical focada na gestão operacional de empresas de locação de equipamentos para eventos. Resolverá o gargalo da prestação de contas de fim de expediente substituindo relatórios manuais por relatos gravados em áudio pelo próprio celular do funcionário, convertidos automaticamente em texto por Inteligência Artificial (Whisper API).

O sistema integrará a jornada de trabalho (ponto com GPS), a movimentação da frota de veículos e a contabilização de diárias de viagem (R$ 150,00/dia) e bônus de domingos/feriados em um único painel gerencial. O Dono da empresa passará a ter uma visão executiva em tempo real dos carros na rua, alertas de anomalias e fechamento de folha automatizado em PDF e Excel.

A arquitetura foi projetada para alta simplicidade de uso (PWA Next.js + PostgreSQL) com custo reduzido e rápido tempo de implementação para o MVP.

> 💡 **Sugestões Proativas Incorporadas:**
> 1. **PWA Offline First para Áudio**: Gravação armazenada temporariamente no navegador se o sinal de 4G falhar no local do evento.
> 2. **Auditoria de Edições**: Todas as correções manuais feitas pelo Dono no espelho de ponto manterão o registro original intacto para segurança trabalhista.

---

📄 **O arquivo `docs/mvp-scope.md` foi gerado e salvo com sucesso.**

Deseja prosseguir para a próxima etapa: a geração do **PRD (Product Requirements Document)**?
