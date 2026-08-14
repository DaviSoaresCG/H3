'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DashboardStatsData,
  AudioDiaryFeedItem,
  AnomalyAlertItem,
  AnomalyType,
  VehicleNoteWithDetails,
  EmployeeTechniqueSummary,
} from '@/types';

type AlertFilterType = 'ALL' | 'CRITICAL' | AnomalyType;

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
  const [employeeTechniques, setEmployeeTechniques] = useState<EmployeeTechniqueSummary[]>([]);
  const [audioFeed, setAudioFeed] = useState<AudioDiaryFeedItem[]>([]);
  const [, setVehicleAlerts] = useState<VehicleNoteWithDetails[]>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioSearchQuery, setAudioSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertFilterType>('ALL');

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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
        setAudioFeed(json.audioDiariesFeed || []);
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

  const handleTogglePlayAudio = (item: AudioDiaryFeedItem) => {
    if (playingAudioId === item.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (item.audioUrl) {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        const audio = new Audio(item.audioUrl);
        audioPlayerRef.current = audio;
        audio.play();
        setPlayingAudioId(item.id);
        audio.onended = () => setPlayingAudioId(null);
        audio.onerror = () => {
          setTimeout(() => setPlayingAudioId(null), 3000);
        };
      } else {
        setPlayingAudioId(item.id);
        setTimeout(() => setPlayingAudioId(null), 4000);
      }
    }
  };

  const filteredAudioFeed = audioFeed.filter(
    (item) =>
      item.employeeName?.toLowerCase().includes(audioSearchQuery.toLowerCase()) ||
      item.transcriptionText?.toLowerCase().includes(audioSearchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
            Painel Executivo
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Monitoramento operacional em tempo real, adicional de técnicas e inteligência de eventos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={audioSearchQuery}
              onChange={(e) => setAudioSearchQuery(e.target.value)}
              placeholder="Buscar em relatos ou equipes..."
              className="pl-10 pr-4 py-2 bg-surface-card border border-border-subtle rounded-lg text-body-sm font-body-sm text-navy-deep placeholder-on-surface-variant focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none w-64 transition-colors"
            />
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-surface-card hover:bg-surface-container border border-border-subtle rounded-lg text-navy-deep transition-colors shadow-sm"
            title="Atualizar dados agora"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO DE KPIS OPERACIONAIS & FINANCEIROS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Funcionários Ativos */}
        <div className="bg-surface-card border-l-4 border-l-secondary border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col justify-between">
          <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
            Presentes Hoje
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-navy-deep leading-none">
              {stats.activeWorkersCount}
            </span>
            <span
              className="material-symbols-outlined text-secondary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              groups
            </span>
          </div>
        </div>

        {/* KPI 2: Veículos na Rua */}
        <div className="bg-surface-card border-l-4 border-l-navy-deep border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col justify-between">
          <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
            Veículos em Rota
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-navy-deep leading-none">
              {stats.vehiclesOnRoadCount}
            </span>
            <span className="material-symbols-outlined text-slate-serious text-[28px]">
              local_shipping
            </span>
          </div>
        </div>

        {/* KPI 3: Adicionais de Técnicas no Mês */}
        <div className="bg-surface-card border-l-4 border-l-navy-deep border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Técnicas (Mês)
            </span>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded font-bold">
              {stats.totalTechniquesCount || 0} un
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="text-2xl font-black text-navy-deep leading-none">
              {totalTechniquesReais}
            </span>
            <span className="material-symbols-outlined text-secondary text-[28px]">
              assignment_turned_in
            </span>
          </div>
        </div>

        {/* KPI 4: Diárias de Viagem no Mês */}
        <div className="bg-surface-card border-l-4 border-l-secondary border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col justify-between">
          <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
            Diárias Viagens (Mês)
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-2xl font-black text-secondary leading-none">
              {totalTravelReais}
            </span>
            <span className="material-symbols-outlined text-secondary text-[28px]">
              flight_takeoff
            </span>
          </div>
        </div>

        {/* KPI 5: Relatos Hoje */}
        <div className="bg-surface-card border-l-4 border-l-slate-serious border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col justify-between">
          <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
            Relatos Áudio
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-navy-deep leading-none">
              {stats.totalAudioDiariesCount}
            </span>
            <span className="material-symbols-outlined text-slate-serious text-[28px]">
              record_voice_over
            </span>
          </div>
        </div>

        {/* KPI 6: Alertas Críticos */}
        <div
          className={`border rounded-xl p-4 shadow-soft flex flex-col justify-between relative overflow-hidden transition-all ${
            totalAlertsCount > 0
              ? 'bg-error-container border-error/30 text-on-error-container'
              : 'bg-surface-card border-border-subtle text-navy-deep'
          }`}
        >
          <span className="font-label-caps text-[11px] uppercase font-bold tracking-wider">
            Alertas / Falhas
          </span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black leading-none">
              {totalAlertsCount}
            </span>
            <span
              className={`material-symbols-outlined text-[28px] ${
                totalAlertsCount > 0 ? 'text-alert-error' : 'text-slate-serious'
              }`}
              style={totalAlertsCount > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              warning
            </span>
          </div>
        </div>
      </section>

      {/* 2. GRID PRINCIPAL: FEED DE ÁUDIOS (2/3) VS ALERTAS & EXCEÇÕES (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FEED DE RELATOS DE ÁUDIO (WHISPER) */}
        <section className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-xl shadow-soft flex flex-col">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">forum</span>
              <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
                Feed de Relatos em Áudio
              </h2>
            </div>
            <Link
              href="/admin/ponto"
              className="font-label-bold text-label-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver todos</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {loading ? (
              <p className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
                Carregando relatos diários...
              </p>
            ) : filteredAudioFeed.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[36px] text-slate-serious">
                  graphic_eq
                </span>
                <p className="text-body-sm">Nenhum relato encontrado hoje.</p>
              </div>
            ) : (
              filteredAudioFeed.map((item) => {
                const isPlaying = playingAudioId === item.id;
                const timeString = new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 pb-4 border-b border-border-subtle last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-on-surface">
                        <span className="font-bold text-navy-deep text-body-md">
                          {item.employeeName || 'Colaborador'}
                        </span>
                        <span className="w-1.5 h-1.5 bg-border-subtle rounded-full"></span>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                          {item.isFallbackText ? 'Relato em Texto' : 'Áudio Transcrito'}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Hoje, {timeString}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      {/* Player Button */}
                      {!item.isFallbackText ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayAudio(item)}
                          className={`rounded-full px-4 py-2 flex items-center gap-3 shrink-0 transition-colors shadow-sm ${
                            isPlaying
                              ? 'bg-secondary text-white'
                              : 'bg-surface-container-low text-navy-deep hover:bg-surface-container'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                          <span className="text-xs font-mono font-bold">
                            {item.durationSeconds ? `${item.durationSeconds}s` : '0:45'}
                          </span>
                        </button>
                      ) : (
                        <div className="rounded-full px-4 py-2 bg-surface-container-low text-on-surface-variant flex items-center gap-2 shrink-0 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                          <span>Texto</span>
                        </div>
                      )}

                      {/* Transcription Text Box */}
                      <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-3.5 flex-1 w-full">
                        <p className="text-body-sm font-body-sm text-on-surface italic leading-relaxed">
                          "{item.transcriptionText || 'Sem transcrição disponível.'}"
                        </p>
                        {item.fallbackReason && (
                          <span className="text-xs text-alert-warning font-semibold block mt-1.5">
                            Motivo do relato em texto: {item.fallbackReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ALERTAS OPERACIONAIS & ANOMALIAS */}
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
