'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // Auto refresh a cada 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Navigation userRole="ADMIN" />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Painel do Gestor</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Acompanhamento ao vivo de funcionários em expediente, frota e relatos por voz.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-2"
          >
            <span>🔄 Atualizar Agora</span>
          </button>
        </div>

        {/* 1. Cards de Métricas Executivas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trabalhando Agora</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {data?.stats?.activeWorkersCount || 0}
              </span>
              <span className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Em Turno
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carros na Rua</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-400 font-mono">
                {data?.stats?.vehiclesOnRoadCount || 0}
              </span>
              <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                Em Uso
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Manutenção</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-rose-400 font-mono">
                {data?.stats?.pendingMaintenanceAlertsCount || 0}
              </span>
              <span className="text-xs text-rose-500 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full">
                Atenção
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anomalias de Ponto</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-indigo-400 font-mono">
                {data?.stats?.anomaliesCount || 0}
              </span>
              <span className="text-xs text-indigo-500 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Revisão
              </span>
            </div>
          </div>
        </div>

        {/* 2. Grid de Conteúdo: Feed de Áudios vs Anomalias & Frota */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed de Relatos por Áudio (2 Colunas no Desktop) */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>🎙️ Feed de Relatos em Áudio (Whisper IA)</span>
              </h3>
              <span className="text-xs text-slate-400">Transcrição Automática</span>
            </div>

            {data?.audioDiariesFeed?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Nenhum relato por áudio enviado hoje.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {data?.audioDiariesFeed?.map((item: any) => (
                  <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white text-sm">{item.employee_name}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg text-xs text-emerald-300 font-medium leading-relaxed">
                      🗣️ "{item.transcription_text}"
                    </div>

                    {item.audio_url && (
                      <div className="pt-1">
                        <audio src={item.audio_url} controls className="w-full h-8 rounded" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anomalias e Avisos de Manutenção (1 Coluna) */}
          <div className="space-y-6">
            {/* Alertas de Manutenção */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-2">
                <span>🛠️ Manutenção da Frota</span>
              </h3>

              {data?.vehicleAlerts?.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Sem alertas de manutenção pendentes.</p>
              ) : (
                <div className="space-y-3">
                  {data?.vehicleAlerts?.map((note: any) => (
                    <div key={note.id} className="p-3 bg-slate-900 border border-rose-500/20 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{note.vehicle_name} ({note.plate})</span>
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold">
                          {note.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{note.note_text}</p>
                      <p className="text-[10px] text-slate-500">Por: {note.reported_by}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anomalias de Ponto (Entrada fora da sede) */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                <span>⚠️ Anomalias de Ponto</span>
              </h3>

              {data?.anomalyAlerts?.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Nenhuma anomalia detectada hoje.</p>
              ) : (
                <div className="space-y-3">
                  {data?.anomalyAlerts?.map((alert: any) => (
                    <div key={alert.id} className="p-3 bg-slate-900 border border-indigo-500/20 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{alert.employeeName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-medium">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
