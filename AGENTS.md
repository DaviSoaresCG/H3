# Contexto do Agente — EventPoint

**Projeto**: EventPoint — Gestão de Ponto com GPS, Frota e Diários de Atividades por Áudio transcritos por IA (Whisper) para empresas de locação de equipamentos de eventos.
**Documentação**: [docs/mvp-scope.md](file:///home/davi/orca/projects/H3/docs/mvp-scope.md) · [docs/prd.md](file:///home/davi/orca/projects/H3/docs/prd.md) · [docs/spec.md](file:///home/davi/orca/projects/H3/docs/spec.md)

---

## 1. Stack Fixada (ADR)
*Decisões fechadas via ADR em `docs/spec.md`. Não propor alternativas.*

| Camada | Tecnologia | ADR |
|--------|------------|-----|
| Fullstack / PWA | Next.js 14+ (App Router) + TypeScript + TailwindCSS | ADR-01 |
| Banco & Auth | PostgreSQL (Supabase) + Auth por CPF/Senha | ADR-02 |
| IA Speech-to-Text | OpenAI Whisper API (Proxy no Server) | ADR-03 |

---

## 2. NUNCA Fazer
- NUNCA criar repositórios ou aplicativos móveis nativos separados para o MVP (utilizar o PWA Next.js).
- NUNCA confirmar o ponto de saída (`CLOCK_OUT`) sem gravação de áudio enviada ou justificativa de fallback em texto.
- NUNCA alterar o status de um veículo na tabela `vehicles` sem registrar o histórico em `vehicle_usages`.
- NUNCA permitir que o Dono faça edições manuais em horários de ponto sem gravar a justificativa (`adjustment_reason`) e a flag `is_adjusted = true`.
- Quando cometer um erro, registrar aqui a correção.

---

## 3. Diretórios Principais
- `src/app/` — Páginas da aplicação Next.js (Mobile, Admin e API Route Handlers)
- `src/lib/` — Clientes de banco de dados, integração com OpenAI e utilitários
- `src/types/` — Interfaces e tipos TypeScript globais

---

## 4. Invariantes Críticas
- `INV-01 [Invariante]` Todo `CLOCK_OUT` possui obrigatoriamente um registro em `audio_diaries` · Verificar em: `/api/ponto` & DB
- `INV-02 [Validação]` Não permitir `CLOCK_IN` com ponto anterior aberto · Verificar em: `/api/ponto`
- `INV-03 [Transição]` Devolução de carro transita status do veículo para `GARAGE` · Verificar em: `/api/frota`
- `INV-04 [Autorização]` Ajuste manual de ponto e alteração de diária restritos a role `ADMIN` · Verificar em: Auth Middleware

---

## 5. Sequência de Build
- **Passo 1**: Setup Next.js App Router + TypeScript + Tailwind + PWA
- **Passo 2**: Migrações SQL e DDL de banco PostgreSQL no Supabase
- **Passo 3**: Autenticação por CPF + Senha com JWT
- **Passo 4**: Batida de Ponto Mobile com GPS + Upload & Transcrição de Áudio (Whisper)
- **Passo 5**: Retirada/Devolução de Frota + Diárias de Viagem (R$ 150/dia)
- **Passo 6**: Dashboard Admin do Dono (Alertas, Feed de Áudio, Ajustes, PDF/Excel)

---

## 6. Variáveis de Ambiente Required
| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão com banco PostgreSQL |
| `OPENAI_API_KEY` | Chave da API para serviço Whisper |
| `JWT_SECRET` | Secret para assinatura de tokens JWT |

---

## Agent skills

### Issue tracker

Issues vivem no GitHub Issues do repo (usa CLI `gh`). Veja `docs/agents/issue-tracker.md`.

### Triage labels

Labels canônicos de triage (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Veja `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context (`CONTEXT.md` + `docs/adr/`). Veja `docs/agents/domain.md`.
