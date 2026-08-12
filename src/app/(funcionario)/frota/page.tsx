'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Vehicle, VehicleNoteCategory } from '@/types';

export default function FrotaPage() {
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeUsages, setActiveUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para adicionar observação de manutenção
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [noteCategory, setNoteCategory] = useState<VehicleNoteCategory>('GENERAL');
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchFleet = async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated) setUser(dataMe.user);

      const res = await fetch('/api/frota');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
        setActiveUsages(data.activeUsages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleVehicleAction = async (vehicleId: string, action: 'PICKUP' | 'RETURN') => {
    try {
      const res = await fetch('/api/frota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, action }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao processar veículo');

      setFeedback(action === 'PICKUP' ? 'Veículo retirado com sucesso!' : 'Veículo devolvido à garagem!');
      setTimeout(() => setFeedback(''), 4000);
      await fetchFleet();
    } catch (err: any) {
      alert(err.message || 'Erro de operação');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedVehicle || !noteText) return;
    setSubmittingNote(true);

    try {
      const res = await fetch('/api/frota/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          category: noteCategory,
          noteText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar observação');

      setFeedback(`Observação registrada para ${selectedVehicle.name}!`);
      setTimeout(() => setFeedback(''), 4000);
      setSelectedVehicle(null);
      setNoteText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-6">
      <Navigation userRole={user?.role} />

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white tracking-tight">Frota da Empresa</h2>
          <p className="text-xs text-slate-400">
            Registre a saída ou chegada dos carros na garagem e informe observações de manutenção.
          </p>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium text-center">
            ✅ {feedback}
          </div>
        )}

        {/* Lista de Veículos */}
        <div className="space-y-4">
          {vehicles.map((v) => {
            const isUserVehicle = activeUsages.some((u) => u.vehicle_id === v.id && u.user_id === user?.id);

            return (
              <div
                key={v.id}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🚗</span>
                    <h3 className="font-bold text-white text-base">{v.name}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                      {v.plate}
                    </span>
                  </div>

                  <div>
                    {v.status === 'GARAGE' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        🟢 Na Garagem
                      </span>
                    )}
                    {v.status === 'ON_ROAD' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                        🟡 Na Rua
                      </span>
                    )}
                    {v.status === 'TRIP' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                        ✈️ Em Viagem
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {v.status === 'GARAGE' && (
                    <button
                      onClick={() => handleVehicleAction(v.id, 'PICKUP')}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
                    >
                      Retirar Carro
                    </button>
                  )}

                  {v.status === 'ON_ROAD' && isUserVehicle && (
                    <button
                      onClick={() => handleVehicleAction(v.id, 'RETURN')}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-md"
                    >
                      Devolver Carro
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedVehicle(v)}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition border border-slate-600"
                  >
                    🛠️ Avisar Manutenção
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal de Observação de Manutenção */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Observação de Manutenção — {selectedVehicle.name} ({selectedVehicle.plate})
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria do Problema</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as VehicleNoteCategory)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="OIL">🛢️ Troca de Óleo / Fluídos</option>
                  <option value="BRAKES">🛑 Freio / Barulhos</option>
                  <option value="TIRES">🛞 Pneus / Roda / Alinhamento</option>
                  <option value="LIGHTS">💡 Farol / Lâmpada Queimada</option>
                  <option value="GENERAL">🔧 Geral / Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descreva o que notou no veículo</label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ex: Barulho estranho na roda dianteira direita ao passar de 60km/h..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
                ></textarea>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                disabled={submittingNote || !noteText}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
              >
                {submittingNote ? 'Salvando...' : 'Salvar Alerta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
