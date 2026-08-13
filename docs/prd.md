# PRD — Product Requirements Document: EventPoint

> **Documento 2 de 4 do Planejamento de Produto Digital**
> Requisitos detalhados de produto (O Quê e Por Quê).

---

## 1. Visão Geral do Produto

- **Descrição**: O **EventPoint** é uma plataforma de gestão operacional para empresas de locação de equipamentos de eventos. Permite que funcionários de campo batam ponto via smartphone com registro de GPS, relatem suas atividades diárias por gravação de voz (convertida automaticamente em texto) no fim do expediente e registrem a retirada e devolução de veículos da frota na garagem da empresa. Oferece ao gestor/dono um painel administrativo com visão em tempo real, alertas de exceções, cálculo de diárias de viagem e domingos/feriados, e exportação de espelhos de ponto.
- **Para quem**: Proprietários e gestores de empresas de locação de estruturas/equipamentos de eventos e seus funcionários operacionais (montadores, motoristas e técnicos de campo).
- **Problema que resolve**: Informalidade e falta de auditoria na jornada de trabalho externa, esquecimento de relatos sobre o que ocorreu nos eventos, descontrole sobre quem está utilizando os veículos da empresa e demora no cálculo manual de diárias de viagem e bônus de fins de semana.
- **Proposta de Valor Central**: Controle de jornada e frota transparente, sem digitação burocrática no fim do dia (relato por áudio), proporcionando ao dono visão clara e conclusiva da operação.

### Princípios de Design de Produto

1. **Atrito Zero no Fim do Expediente**: O funcionário exausto pós-evento não deve digitar textos longos; falar em áudio é o meio primário de relato.
2. **Orientado a Exceções para o Gestor**: Se tudo estiver ocorrendo normalmente, a tela do dono fica limpa; o sistema deve destacar apenas anomalias (atrasos, carros pendentes, ausência de áudio).
3. **Auditabilidade Trabalhista**: Toda marcação de ponto, alteração manual pelo gestor ou falta de GPS deve ser registrada de forma transparente e imutável no histórico.
4. **Resiliência a Falhas de Conexão**: O aplicativo mobile deve aceitar ações do usuário mesmo quando a internet 4G no local do evento estiver instável.

---

## 2. Objetivos e Métricas de Sucesso

### Objetivos do MVP

| Objetivo | Descrição |
|----------|-----------|
| **O1 — Redução de Erros de Ponto** | Eliminar o esquecimento de registro de ponto e diários através de notificações e interface simplificada. |
| **O2 — Controle em Tempo Real de Frota** | Garantir que o gestor saiba exatamente quem retirou cada veículo e quem está com ele no momento. |
| **O3 — Automatização de Fechamento de Mês** | Reduzir o tempo de cálculo de folha, diárias de viagem (R$ 150/dia) e domingos/feriados de dias para minutos. |

### Métricas de Sucesso

| Métrica | Alvo MVP | Como medir |
|---------|----------|------------|
| **Adesão de Relatos por Áudio** | ≥ 95% das saídas de ponto com áudio | Qtd de `CLOCK_OUT` com áudio anexo / Total de `CLOCK_OUT` |
| **Tempo Médio de Fechamento de Folha** | ≤ 15 minutos por mês | Tempo gasto pelo gestor no painel de fechamento |
| **Erros de Devolução de Veículo** | ≤ 2% de inconsistências de frota | Ocorrências de carros na rua sem motorista registrado |

---

## 3. Personas e Casos de Uso

### Personas

#### **P1: Carlos — Montador/Motorista Operacional**
- **Idade**: 32 anos.
- **Aparelho**: Smartphone Android intermediário.
- **Contexto**: Passa o dia em trânsito e nos locais dos eventos montando estruturas. Deseja agilidade total.

#### **P2: Roberto — Proprietário / Gestor Geral**
- **Idade**: 48 anos.
- **Aparelho**: Notebook / Tablet no escritório ou celular em trânsito.
- **Contexto**: Precisa controlar de 10 a 30 funcionários, 5 veículos e acompanhar custos de viagens e horas extras sem burocracia.

### Mapa de Casos de Uso

| ID | Caso de Uso | Persona | Feature Relacionada | Prioridade |
|----|-------------|---------|---------------------|------------|
| **UC-01** | Realizar Login no Sistema | P1, P2 | Autenticação por CPF | Alta |
| **UC-02** | Bater Ponto de Entrada / Almoço | P1 | Ponto Mobile com GPS | Alta |
| **UC-03** | Bater Ponto de Saída com Áudio | P1 | Relato por Voz & Transcrição | Alta |
| **UC-04** | Registrar Retirada / Devolução de Veículo | P1 | Controle de Frota | Alta |
| **UC-05** | Visualizar Status da Frota em Tempo Real | P2 | Painel de Frota | Alta |
| **UC-06** | Ouvir Áudio e Ler Transcrição de Atividades | P2 | Feed de Relatos | Alta |
| **UC-07** | Agendar Viagem e Calcular Diárias (R$ 150/dia) | P2, P1 | Viagens & Diárias | Alta |
| **UC-08** | Configurar Pagamento de Domingos/Feriados | P2 | Regras de Fechamento | Alta |
| **UC-09** | Ajustar Ponto Manualmente e Aprovar | P2 | Espelho de Ponto | Alta |
| **UC-10** | Emitir Espelho de Ponto (PDF) e Excel | P2 | Relatórios & Exportação | Alta |

---

## 4. Requisitos Funcionais

### RF-01: Autenticação de Funcionários e Gestor

- **Descrição**: O sistema deve permitir o acesso seguro de funcionários e gestores utilizando CPF ou Telefone e senha individual.
- **Critérios de Aceite**:
  - Aceita apenas CPFs válidos.
  - Redireciona o usuário para a interface apropriada (Mobile para Funcionário, Admin para Gestor).
- **Regras**:
  - Somente usuários ativos podem realizar login. | **Tipo: Validação**
  - O gestor possui permissões de visualização e edição de todos os registros. | **Tipo: Autorização**
- **Tratamento de erros**:
  - CPF ou senha incorretos → Exibir mensagem "Credenciais inválidas".

---

### RF-02: Batida de Ponto com Geolocalização (GPS) e Raio da Sede

- **Descrição**: O funcionário deve registrar entradas, saídas e pausas pelo smartphone com captura de coordenadas de GPS.
- **Critérios de Aceite**:
  - Captura Latitude, Longitude e marcação de horário do servidor.
  - Se a batida de entrada (`CLOCK_IN`) for registrada fora do raio configurado da sede (ex: > 500m) e o funcionário NÃO estiver em viagem agendada, o sistema dispara um alerta de `Entrada Fora da Sede`.
  - Se a localização falhar, permite o registro mas marca a flag `GPS Indisponível`.
- **Regras**:
  - Não é permitido registrar novo ponto de entrada se já houver um ponto de entrada aberto sem saída. | **Tipo: Validação**
  - Entrada fora do raio da sede sem viagem ativa gera alerta de anomalia no painel admin. | **Tipo: Validação**
  - O horário oficial registrado é sempre o horário UTC do servidor. | **Tipo: Invariante**
- **Tratamento de erros**:
  - GPS desativado no dispositivo → Exibir aviso "Ative o GPS para melhor precisão" e permitir continuar após confirmação.

---

### RF-03: Gravação de Relato Diário por Áudio (Speech-to-Text)

- **Descrição**: No momento do registro de saída (`CLOCK_OUT`), o sistema deve solicitar a gravação de um áudio de até 2 minutos relatando as atividades do dia.
- **Critérios de Aceite**:
  - Grava o áudio, envia ao servidor e gera a transcrição em texto.
  - Disponibiliza botão de escuta prévia antes do envio.
- **Regras**:
  - O ponto de saída só é confirmado após o áudio ser enviado ou se o usuário selecionar "Fallback em Texto" justificando a ausência do áudio. | **Tipo: Transição de Estado**
  - O áudio original deve ser armazenado inalterado. | **Tipo: Invariante**
- **Tratamento de erros**:
  - Erro no microfone → Apresentar caixa de texto com justificativa obrigatória ("Microfone com defeito").

---

### RF-04: Registro de Retirada e Devolução de Veículos

- **Descrição**: O funcionário deve registrar quando pega um veículo na garagem da empresa e quando o devolve.
- **Critérios de Aceite**:
  - O sistema exibe carros disponíveis na garagem para retirada.
  - Ao devolver, atualiza o status do carro para "Disponível".
- **Regras**:
  - Um veículo com status "Em Uso" não pode ser retirado por outro funcionário sem devolução prévia. | **Tipo: Validação**
  - Se o veículo estiver associado a uma viagem ativa, o status fica em "Em Viagem". | **Tipo: Transição de Estado**
- **Tratamento de erros**:
  - Tentar retirar carro já em uso → Exibir alerta "Este veículo está registrado com [Nome do Funcionário]".

---

### RF-05: Gestão de Viagens e Diárias (R$ 150,00/dia)

- **Descrição**: O sistema deve permitir o agendamento de viagens para eventos fora da cidade e calcular diárias de R$ 150,00 por dia.
- **Critérios de Aceite**:
  - Calcula o valor total `Dias * R$ 150,00`.
  - Exibe os valores no espelho de ponto do funcionário.
- **Regras**:
  - O gestor pode alterar o valor da diária no fechamento do mês em casos de diária parcial. | **Tipo: Autorização**
  - Veículos em viagem não disparam alertas de devolução diária na sede. | **Tipo: Invariante**
- **Tratamento de erros**:
  - Data final da viagem anterior à data inicial → Exibir mensagem "Data inválida".

---

### RF-09: Adicional de Técnica de Evento (R$ 150,00 por Técnica/Evento/Dia)

- **Descrição**: Quando o funcionário atua operando equipamentos em um evento (Técnico de Som, Iluminação, etc.), ele recebe um adicional por Técnica realizada (R$ 150,00 por evento por dia).
- **Critérios de Aceite**:
  - Registra a quantidade de técnicas prestadas no dia pelo funcionário.
  - Exemplo: 2 eventos em 2 dias = 4 técnicas * R$ 150 = R$ 600,00 somados na folha do funcionário.
- **Regras**:
  - Cada técnica registrada acumula R$ 150,00 no fechamento mensal do funcionário. | **Tipo: Validação**
  - O gestor pode validar e alterar a quantidade de técnicas no espelho de ponto. | **Tipo: Autorização**
- **Tratamento de erros**:
  - Quantidade de técnicas negativa → Exibir mensagem "Quantidade inválida".

---

### RF-06: Regra de Domingos e Feriados

- **Descrição**: Permitir configurar se o trabalho em domingos e feriados será remunerado por Diária Fixa ou por Horas Extras (100%).
- **Critérios de Aceite**:
  - Exibe a opção de escolha na criação da escala ou na revisão mensal.
  - Recalcula automaticamente os totais do mês conforme a opção escolhida.
- **Regras**:
  - Padrão do sistema é calcular Horas Extras a 100%, a menos que a opção "Diária Fixa" seja selecionada. | **Tipo: Validação**
- **Tratamento de erros**:
  - Falta de definição de valor na diária fixa → Solicitar preenchimento antes de salvar.

---

### RF-07: Painel Administrativo de Alertas e Feed de Áudios

- **Descrição**: Tela inicial do gestor exibindo alertas em tempo real e lista de relatos gravados.
- **Critérios de Aceite**:
  - Exibe cards de alertas (atrasos, carros na rua, faltas de áudio, pontos sem GPS).
  - Permite escutar os áudios e ler a transcrição em texto.
- **Regras**:
  - Apenas gestores autenticados podem acessar esta tela. | **Tipo: Autorização**
- **Tratamento de erros**:
  - Falha ao carregar áudio → Exibir botão de tentar novamente.

---

### RF-08: Espelho de Ponto, Ajustes Manuais e Exportação

- **Descrição**: Emissão da folha de ponto mensal em PDF e Excel, com histórico de correções feitas pelo gestor.
- **Critérios de Aceite**:
  - Gera PDF formatado com linhas de batidas, diárias e campo de assinatura.
  - Exporta arquivo Excel com dados analíticos.
- **Regras**:
  - Toda edição de horário feita pelo gestor exige uma justificativa registrada e gera uma marcação de "Ponto Ajustado". | **Tipo: Invariante**
- **Tratamento de erros**:
  - Período sem registros → Gerar PDF com indicação "Sem registros no período".

---

## 5. Requisitos Não-Funcionais

| Categoria | Requisito | Métrica | Prioridade |
|-----------|-----------|---------|------------|
| **Performance** | Tempo de resposta do registro de ponto | ≤ 2 segundos | Alta |
| **Performance** | Tempo de transcrição de áudio via IA | ≤ 15 segundos | Média |
| **Compatibilidade** | Navegadores Mobile (Chrome Android, Safari iOS) | 100% funcionalidade PWA | Alta |
| **Usabilidade** | Registro de Ponto e Áudio em | ≤ 3 toques | Alta |
| **Segurança** | Armazenamento de Senhas e Dados | Hashing bcrypt/Argon2 | Alta |
| **Disponibilidade** | Uptime do serviço | ≥ 99.5% | Alta |

---

## 6. Arquitetura de Informação e Navegação

### Layout Principal (Mobile Funcionário)

```
┌──────────────────────────────────────────┐
│  EventPoint           [Status: No Evento]│
├──────────────────────────────────────────┤
│                                          │
│   [ BATER PONTO (Entrada / Saída) ]      │
│                                          │
│   [ RETIRAR / DEVOLVER VEÍCULO ]         │
│                                          │
│   [ MINHAS VIAGENS (Ativas) ]            │
│                                          │
└──────────────────────────────────────────┘
```

### Layout Principal (Admin Gestor)

```
┌──────────────────────────────────────────────────────────┐
│ EventPoint Admin   [Ao Vivo] [Áudios] [Frota] [Ponto]    │
├──────────────────────────────────────────────────────────┤
│ 🚨 ALERTAS (3) | 🚗 CARROS NA RUA (2) | 👥 TRABALHANDO (8)│
├──────────────────────────────────────────────────────────┤
│ FEED DE RELATOS DE ÁUDIO DO DIA                          │
│ - Carlos (18:05): "Atendemos evento no Buffet X..." ▶ 🔊 │
└──────────────────────────────────────────────────────────┘
```

---

## 7. User Flows Detalhados

### UF-01: Bater Ponto de Saída com Áudio

```
[Funcionário Clica em "Bater Ponto de Saída"]
    │
    ▼
[Captura Localização GPS]
    │
    ▼
[Abre Tela: "Grave o Relato do Dia (Máx 2 min)"]
    │
    ▼
[Clique em Gravar → Fala o Relato → Clique em Concluir]
    │
    ├───── Falha de Mic ─────► [Opção: Digitar Texto + Justificativa]
    │                                   │
    ▼ Sucesso                           │
[Envia Áudio + Coordenadas ao Servidor] ◄─┘
    │
    ▼
[Servidor Registra Ponto + Transcreve Áudio em Background]
    │
    ▼
[Tela de Confirmação: "Ponto Fechado com Sucesso!"]
```

---

## 8. Modelo de Dados

### Tabela `time_entries`

```sql
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
```

### Tabela `audio_diaries`

```sql
CREATE TABLE audio_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id UUID NOT NULL UNIQUE REFERENCES time_entries(id) ON DELETE CASCADE,
    audio_url TEXT,
    transcription_text TEXT,
    is_fallback_text BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_reason TEXT,
    duration_seconds INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela `vehicle_usages`

```sql
CREATE TABLE vehicle_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    user_id UUID NOT NULL REFERENCES users(id),
    trip_id UUID REFERENCES trips(id),
    picked_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_USE' CHECK (status IN ('IN_USE', 'RETURNED', 'ON_TRIP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. Roadmap e Priorização

### Sprint Plan (4 Sprints de 1 Semana)

- **Sprint 1**: Setup de Auth (CPF/Senha), Modelo de Dados PostgreSQL e Registro de Ponto Mobile com GPS.
- **Sprint 2**: Gravação de Áudio no Mobile + Integração com OpenAI Whisper API + Fallback de texto.
- **Sprint 3**: Módulo de Controle de Frota (Retirada/Devolução) + Módulo de Viagens (Diárias R$ 150) e Domingos/Feriados.
- **Sprint 4**: Painel Administrativo do Dono (Alertas, Feed de Áudio, Espelho de Ponto, Ajustes Manuais, Exportação PDF/Excel).

---

## 10. Critérios de Aceite Globais

```
1. ✅ Registro de Ponto Mobile grava entradas/saídas com GPS e fallback para falhas de localização.
2. ✅ Áudios de saída são gravados, armazenados e convertidos em texto legível no painel admin.
3. ✅ Retirada e devolução de veículos atualizam o status visual da frota instantaneamente.
4. ✅ Diárias de viagem (R$ 150/dia) e adicionais de domingos/feriados são somados no espelho de ponto.
5. ✅ Dono consegue visualizar alertas de anomalias e exportar o relatório mensal em PDF e Excel.
```

---

## 11. Glossário

| Termo | Definição |
|-------|-----------|
| **CLOCK_OUT** | Ponto de saída do expediente. |
| **Speech-to-Text** | Tecnologia de IA que converte áudio falado em texto escrito. |
| **PWA (Progressive Web App)** | Aplicação web instalável no celular com comportamento de app nativo. |
| **Espelho de Ponto** | Documento mensal com o detalhamento de todas as entradas, saídas e horas do funcionário. |

---

📄 **O arquivo `docs/prd.md` foi gerado e salvo com sucesso.**

Deseja prosseguir para a próxima etapa: a geração da **SPEC (Especificação Técnica de Implementação)**?
