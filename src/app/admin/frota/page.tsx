'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

export default function AdminFrotaPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeUsages, setActiveUsages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminFleet = async () => {
    try {
      const resFrota = await fetch('/api/frota');
      const dataFrota = await resFrota.json();
      if (dataFrota.success) {
        setVehicles(dataFrota.vehicles || []);
        setActiveUsages(dataFrota.activeUsages || []);
      }

      const resNotes = await fetch('/api/frota/notes');
      const dataNotes = await resNotes.json();
      if (dataNotes.success) {
        setNotes(dataNotes.notes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminFleet();
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Navigation userRole="ADMIN" />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Gestão da Frota de Veículos</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Acompanhamento de localização da garagem, motoristas em trânsito e alertas de manutenção.
          </p>
        </div>

        {/* Status dos Carros em Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🚗</span>
                  <div>
                    <h3 className="font-bold text-white text-base">{v.name}</h3>
                    <span className="text-xs font-mono text-slate-400">{v.plate}</span>
                  </div>
                </div>
                {v.status === 'GARAGE' && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                    Na Garagem
                  </span>
                )}
                {v.status === 'ON_ROAD' && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
                    Na Rua
                  </span>
                )}
              </div>

              {/* Informação do Motorista se estiver Na Rua */}
              {v.status === 'ON_ROAD' && (
                <div className="p-3 bg-slate-900 rounded-xl space-y-1 text-xs">
                  <span className="text-slate-400">Motorista Atual:</span>
                  <p className="font-bold text-white">
                    {activeUsages.find((u) => u.vehicle_id === v.id)?.driver_name || 'Funcionário em trânsito'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabela de Observações / Alertas de Manutenção */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span>🛠️ Observações e Avisos de Manutenção</span>
          </h3>

          {notes.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">Nenhuma observação de manutenção registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Veículo</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3">Relato do Motorista</th>
                    <th className="py-3 px-3">Enviado por</th>
                    <th className="py-3 px-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {notes.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-bold text-white">{n.vehicle_name} ({n.plate})</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold">
                          {n.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{n.note_text}</td>
                      <td className="py-3 px-3 text-slate-400">{n.reported_by}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
