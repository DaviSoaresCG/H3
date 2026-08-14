'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DashboardStatsData,
  AnomalyAlertItem,
  AnomalyType,
  VehicleNoteWithDetails,
  EmployeeTechniqueSummary,
  EmployeePontoTodayStatus,
} from '@/types';
import { formatEmployeePontoBadge } from '@/lib/dashboard-aggregator';

type AlertFilterType = 'ALL' | 'CRITICAL' | AnomalyType;
type EmployeePontoFilter = 'ALL' | 'PUNCHED' | 'OUTSIDE_HQ' | 'NO_PUNCH';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStatsData>({
    activeWorkersCount: 0,
    vehiclesOnRoadCount: 0,
    pendingMaintenanceAlertsCount: 0,
    anomaliesCount: 0,
    totalAudioDiariesCount: 0,
    totalTechniquesAmountCentavos: 0,
    totalTechniquesCount: 0,
    totalTravelAllowancesCentavos: 0,
  });
  const [, setEmployeeTechniques] = useState<EmployeeTechniqueSummary[]>([]);
  const [employeesPontoStatus, setEmployeesPontoStatus] = useState<EmployeePontoTodayStatus[]>([]);
  const [, setVehicleAlerts] = useState<VehicleNoteWithDetails[]>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [pontoFilter, setPontoFilter] = useState<EmployeePontoFilter>('ALL');
  const [alertFilter, setAlertFilter] = useState<AlertFilterType>('ALL');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setStats(
          json.stats || {
            activeWorkersCount: 0,
            vehiclesOnRoadCount: 0,
            pendingMaintenanceAlertsCount: 0,
            anomaliesCount: 0,
            totalAudioDiariesCount: 0,
            totalTechniquesAmountCentavos: 0,
            totalTechniquesCount: 0,
            totalTravelAllowancesCentavos: 0,
          }
        );
        setEmployeeTechniques(json.employeeTechniques || json.stats?.employeeTechniques || []);
        setEmployeesPontoStatus(json.employeesPontoStatus || []);
        setVehicleAlerts(json.vehicleAlerts || []);
        setAnomalyAlerts(json.anomalyAlerts || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Filtros dos funcionários
  const filteredEmployees = employeesPontoStatus.filter((emp) => {
    const matchesSearch =
      emp.employeeName.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
      emp.cpf.includes(employeeSearchQuery);

    if (!matchesSearch) return false;

    if (pontoFilter === 'PUNCHED') return emp.hasPunchedToday;
    if (pontoFilter === 'OUTSIDE_HQ') return emp.hasPunchedToday && emp.isOutsideHq;
    if (pontoFilter === 'NO_PUNCH') return !emp.hasPunchedToday;
    return true;
  });

  const filteredAnomalies =
    alertFilter === 'ALL'
      ? anomalyAlerts
      : alertFilter === 'CRITICAL'
      ? anomalyAlerts.filter((a) => a.severity === 'CRITICAL')
      : anomalyAlerts.filter((a) => a.type === alertFilter);

  const totalAlertsCount = stats.anomaliesCount + stats.pendingMaintenanceAlertsCount;
  const totalTechniquesReais = ((stats.totalTechniquesAmountCentavos || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const totalTravelReais = ((stats.totalTravelAllowancesCentavos || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const punchedCount = employeesPontoStatus.filter((e) => e.hasPunchedToday).length;
  const outsideHqCount = employeesPontoStatus.filter((e) => e.hasPunchedToday && e.isOutsideHq).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
            Painel Executivo
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Monitoramento de ponto em tempo real, validação de raio GPS e adicionais acumulados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-surface-card hover:bg-surface-container border border-border-subtle rounded-lg text-navy-deep transition-colors shadow-sm flex items-center gap-2 text-xs font-bold"
            title="Atualizar dados agora"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span className="hidden sm:inline">Atualizar Agora</span>
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO DE KPIS ESTRATÉGICOS (3 CARDS) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: Adicionais de Técnicas no Mês */}
        <div className="bg-surface-card border-l-4 border-l-navy-deep border border-border-subtle rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[12px] text-on-surface-variant uppercase font-bold tracking-wider">
              Técnicas (Mês)
            </span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold">
              {stats.totalTechniquesCount || 0} montagens
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-black text-navy-deep leading-none">
              {totalTechniquesReais}
            </span>
            <span className="material-symbols-outlined text-secondary text-[32px]">
              assignment_turned_in
            </span>
          </div>
        </div>

        {/* KPI 2: Diárias de Viagem no Mês */}
        <div className="bg-surface-card border-l-4 border-l-secondary border border-border-subtle rounded-xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[12px] text-on-surface-variant uppercase font-bold tracking-wider">
              Diárias Viagens (Mês)
            </span>
            <span className="text-xs bg-secondary-container/60 text-on-secondary-container px-2 py-0.5 rounded font-bold">
              R$ 150/dia
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-black text-secondary leading-none">
              {totalTravelReais}
            </span>
            <span className="material-symbols-outlined text-secondary text-[32px]">
              flight_takeoff
            </span>
          </div>
        </div>

        {/* KPI 3: Alertas Operacionais & Anomalias */}
        <div
          className={`border rounded-xl p-5 shadow-soft flex flex-col justify-between relative overflow-hidden transition-all ${
            totalAlertsCount > 0
              ? 'bg-error-container border-error/30 text-on-error-container'
              : 'bg-surface-card border-border-subtle text-navy-deep'
          }`}
        >
          <span className="font-label-caps text-[12px] uppercase font-bold tracking-wider">
            Alertas / Falhas Operacionais
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-black leading-none">
              {totalAlertsCount}
            </span>
            <span
              className={`material-symbols-outlined text-[32px] ${
                totalAlertsCount > 0 ? 'text-alert-error' : 'text-slate-serious'
              }`}
              style={totalAlertsCount > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              warning
            </span>
          </div>
        </div>
      </section>

      {/* 2. GRID PRINCIPAL: MONITORAMENTO DE PONTO & GEOFENCE (8 cols) VS ALERTAS ATIVOS (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LISTA DE FUNCIONÁRIOS E MONITORAMENTO DE PONTO / RAIO GPS */}
        <section className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-xl shadow-soft flex flex-col">
          <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface-container-lowest rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">how_to_reg</span>
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
                  Ponto da Equipe Hoje
                </h2>
                <p className="text-xs text-on-surface-variant">
                  {punchedCount} de {employeesPontoStatus.length} colaboradores registraram ponto hoje
                  {outsideHqCount > 0 && (
                    <span className="text-alert-error font-bold ml-1">
                      ({outsideHqCount} fora do raio da sede)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Link
              href="/admin/ponto"
              className="font-label-bold text-label-bold text-secondary hover:underline cursor-pointer flex items-center gap-1 text-xs self-start sm:self-auto"
            >
              <span>Espelho de Ponto Geral</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          {/* Filtros e Busca Rápida de Colaborador */}
          <div className="p-4 border-b border-border-subtle bg-surface-card flex flex-col sm:flex-row gap-3 justify-between items-center">
            {/* Abas de Filtro */}
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setPontoFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                  pontoFilter === 'ALL'
                    ? 'bg-navy-deep text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Todos ({employeesPontoStatus.length})
              </button>
              <button
                onClick={() => setPontoFilter('PUNCHED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                  pontoFilter === 'PUNCHED'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Bateram Ponto ({punchedCount})
              </button>
              <button
                onClick={() => setPontoFilter('OUTSIDE_HQ')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                  pontoFilter === 'OUTSIDE_HQ'
                    ? 'bg-alert-error text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Fora do Raio ({outsideHqCount})
              </button>
              <button
                onClick={() => setPontoFilter('NO_PUNCH')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                  pontoFilter === 'NO_PUNCH'
                    ? 'bg-surface-container-high text-navy-deep shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Sem Ponto ({employeesPontoStatus.length - punchedCount})
              </button>
            </div>

            {/* Input de Busca */}
            <div className="relative w-full sm:w-60">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                placeholder="Buscar funcionário..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-medium text-navy-deep placeholder-on-surface-variant focus:border-navy-deep outline-none"
              />
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <p className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
                Carregando status dos colaboradores...
              </p>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[36px] text-slate-serious">
                  person_off
                </span>
                <p className="text-body-sm font-semibold">Nenhum funcionário encontrado no filtro selecionado.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-container-lowest text-on-surface-variant uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Status Hoje</th>
                    <th className="py-3 px-4">Última Batida</th>
                    <th className="py-3 px-4">Raio da Empresa</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredEmployees.map((emp) => {
                    const badge = formatEmployeePontoBadge(emp.lastEntryType);
                    const formattedTime = emp.lastTimestamp
                      ? new Date(emp.lastTimestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--';

                    const isExpanded = expandedEmployeeId === emp.userId;

                    return (
                      <tr
                        key={emp.userId}
                        className={`hover:bg-surface-container-lowest/80 transition-colors ${
                          emp.hasPunchedToday && emp.isOutsideHq ? 'bg-alert-error/5' : ''
                        }`}
                      >
                        {/* Colaborador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-navy-deep/10 text-navy-deep font-bold flex items-center justify-center text-xs shrink-0">
                              {emp.employeeName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-navy-deep">{emp.employeeName}</p>
                              <p className="text-[10px] text-on-surface-variant font-mono">
                                CPF: {emp.cpf}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Hoje */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border text-[11px] ${badge.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                badge.status === 'WORKING'
                                  ? 'bg-secondary animate-pulse'
                                  : badge.status === 'MEAL'
                                  ? 'bg-alert-warning'
                                  : badge.status === 'FINISHED'
                                  ? 'bg-navy-deep'
                                  : 'bg-on-surface-variant/40'
                              }`}
                            ></span>
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* Horário da Última Batida */}
                        <td className="py-3.5 px-4">
                          {emp.hasPunchedToday ? (
                            <div>
                              <span className="font-mono font-bold text-navy-deep text-xs">
                                {formattedTime}
                              </span>
                              <span className="text-[10px] text-on-surface-variant block">
                                {emp.lastEntryType === 'CLOCK_IN'
                                  ? 'Entrada'
                                  : emp.lastEntryType === 'MEAL_START'
                                  ? 'Início Almoço'
                                  : emp.lastEntryType === 'MEAL_END'
                                  ? 'Retorno Almoço'
                                  : 'Saída'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant font-mono text-xs">--:--</span>
                          )}
                        </td>

                        {/* Localização & Geofence da Empresa */}
                        <td className="py-3.5 px-4">
                          {emp.hasPunchedToday ? (
                            emp.isOutsideHq ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container border border-error/40 font-bold text-[11px]">
                                <span className="material-symbols-outlined text-[14px]">
                                  wrong_location
                                </span>
                                <span>Fora do Raio da Sede</span>
                              </span>
                            ) : emp.gpsStatus === 'UNAVAILABLE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-alert-warning/20 text-navy-deep border border-alert-warning/40 font-bold text-[11px]">
                                <span className="material-symbols-outlined text-[14px]">
                                  location_disabled
                                </span>
                                <span>Sem GPS</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container border border-secondary/30 font-bold text-[11px]">
                                <span className="material-symbols-outlined text-[14px] text-secondary">
                                  check_circle
                                </span>
                                <span>Dentro da Sede</span>
                              </span>
                            )
                          ) : (
                            <span className="text-on-surface-variant text-xs">Aguardando registro</span>
                          )}
                        </td>

                        {/* Ação */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {emp.transcriptionText && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedEmployeeId(isExpanded ? null : emp.userId)
                                }
                                className="p-1 rounded text-on-surface-variant hover:text-navy-deep hover:bg-surface-container transition"
                                title="Ver relato de áudio"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {isExpanded ? 'expand_less' : 'record_voice_over'}
                                </span>
                              </button>
                            )}

                            <Link
                              href={`/admin/ponto?userId=${emp.userId}`}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-navy-deep font-bold rounded text-xs transition border border-border-subtle inline-flex items-center gap-1"
                            >
                              <span>Espelho</span>
                              <span className="material-symbols-outlined text-[14px]">
                                arrow_forward
                              </span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Relato expandido se clicado */}
          {expandedEmployeeId && (
            <div className="p-4 bg-surface-container-lowest border-t border-border-subtle">
              {(() => {
                const emp = employeesPontoStatus.find((e) => e.userId === expandedEmployeeId);
                if (!emp || !emp.transcriptionText) return null;
                return (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-navy-deep flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[16px]">
                        mic
                      </span>
                      <span>Último Relato de Áudio — {emp.employeeName}:</span>
                    </p>
                    <p className="text-xs italic text-on-surface-variant bg-surface-card p-3 rounded-lg border border-border-subtle leading-relaxed">
                      "{emp.transcriptionText}"
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* ALERTAS OPERACIONAIS & ANOMALIAS (4 cols) */}
        <section className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-xl shadow-soft flex flex-col">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-alert-warning text-[24px]">
                crisis_alert
              </span>
              <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
                Alertas Ativos
              </h2>
            </div>
            <span className="bg-error-container text-on-error-container text-label-bold font-label-bold px-2 py-0.5 rounded-full text-xs">
              {filteredAnomalies.length}
            </span>
          </div>

          <div className="p-4 border-b border-border-subtle flex gap-1.5 overflow-x-auto bg-surface-card">
            <button
              onClick={() => setAlertFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                alertFilter === 'ALL'
                  ? 'bg-navy-deep text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setAlertFilter('CRITICAL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                alertFilter === 'CRITICAL'
                  ? 'bg-alert-error text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Críticos (&gt;12h)
            </button>
            <button
              onClick={() => setAlertFilter('OUTSIDE_HQ')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                alertFilter === 'OUTSIDE_HQ'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Fora Sede
            </button>
          </div>

          <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto max-h-[500px]">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[36px] text-success-vibrant">
                  check_circle
                </span>
                <p className="text-body-sm font-semibold text-navy-deep">Nenhuma anomalia ativa.</p>
                <p className="text-xs text-on-surface-variant">Toda a operação está dentro dos conformes.</p>
              </div>
            ) : (
              filteredAnomalies.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex flex-col gap-2 shadow-sm ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-error-container/40 border-error text-on-error-container'
                      : alert.severity === 'HIGH'
                      ? 'bg-alert-warning/15 border-alert-warning text-navy-deep'
                      : 'bg-surface-container-low border-border-subtle text-navy-deep'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-alert-error">
                        {alert.type === 'SHIFT_EXCEEDED_12H'
                          ? 'timer_off'
                          : alert.type === 'OUTSIDE_HQ'
                          ? 'wrong_location'
                          : alert.type === 'VEHICLE_OVERDUE'
                          ? 'car_crash'
                          : 'location_off'}
                      </span>
                      <span className="font-bold text-body-sm">{alert.employeeName}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-card">
                      {alert.severity}
                    </span>
                  </div>

                  <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
