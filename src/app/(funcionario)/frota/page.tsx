'use client';

import { useState, useEffect, useCallback } from 'react';
import { Vehicle, VehicleNoteCategory, User, VehicleUsageWithDetails, VehicleNoteWithDetails } from '@/types';
import { getCategoryDisplayName } from '@/lib/maintenance-validator';

export default function FrotaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeUsages, setActiveUsages] = useState<VehicleUsageWithDetails[]>([]);
  const [, setUsageHistory] = useState<VehicleUsageWithDetails[]>([]);
  const [pendingNotes, setPendingNotes] = useState<VehicleNoteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para adicionar observação / avaria
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [noteCategory, setNoteCategory] = useState<VehicleNoteCategory>('GENERAL');
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Modal de Retirada
  const [pickupVehicle, setPickupVehicle] = useState<Vehicle | null>(null);
  const [pickupKm, setPickupKm] = useState('');
  const [pickupFuel, setPickupFuel] = useState('100%');

  // Modal de Devolução
  const [returnVehicle, setReturnVehicle] = useState<Vehicle | null>(null);
  const [returnKm, setReturnKm] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const [operatingVehicleId, setOperatingVehicleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFleet = useCallback(async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated && dataMe.user) {
        setUser(dataMe.user);
      }

      const res = await fetch('/api/frota');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
        setActiveUsages(data.activeUsages || []);
        setUsageHistory(data.usageHistory || []);
      }

      const resNotes = await fetch('/api/frota/notes?status=PENDING');
      const dataNotes = await resNotes.json();
      if (dataNotes.success) {
        setPendingNotes(dataNotes.notes || []);
      }
    } catch (e) {
      console.error('Erro ao buscar dados de frota:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  const handlePickupConfirm = async () => {
    if (!pickupVehicle) return;
    setOperatingVehicleId(pickupVehicle.id);

    try {
      const res = await fetch('/api/frota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: pickupVehicle.id,
          action: 'PICKUP',
          odometerKm: pickupKm ? Number(pickupKm) : undefined,
          fuelLevel: pickupFuel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao retirar veículo');
      }

      setFeedback({ type: 'success', text: `Veículo ${pickupVehicle.name} retirado com sucesso!` });
      setTimeout(() => setFeedback(null), 4000);
      setPickupVehicle(null);
      setPickupKm('');
      await fetchFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao retirar veículo' });
    } finally {
      setOperatingVehicleId(null);
    }
  };

  const handleReturnConfirm = async () => {
    if (!returnVehicle) return;
    setOperatingVehicleId(returnVehicle.id);

    try {
      const res = await fetch('/api/frota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: returnVehicle.id,
          action: 'RETURN',
          returnNotes: returnNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao devolver veículo');
      }

      setFeedback({ type: 'success', text: `Veículo ${returnVehicle.name} devolvido à garagem com sucesso!` });
      setTimeout(() => setFeedback(null), 4000);
      setReturnVehicle(null);
      setReturnKm('');
      setReturnNotes('');
      await fetchFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao devolver veículo' });
    } finally {
      setOperatingVehicleId(null);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !noteText.trim()) return;
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
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar observação');
      }

      setFeedback({ type: 'success', text: `Observação registrada para ${selectedVehicle.name}!` });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedVehicle(null);
      setNoteText('');
      await fetchFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao registrar observação' });
    } finally {
      setSubmittingNote(false);
    }
  };

  // Veículo em uso pelo usuário atual
  const myActiveUsage = activeUsages.find((u) => u.userId === user?.id && u.status === 'IN_USE');
  const myVehicle = myActiveUsage ? vehicles.find((v) => v.id === myActiveUsage.vehicleId) : null;

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`w-full p-3.5 rounded-xl border text-body-sm font-medium flex items-center gap-2.5 shadow-soft ${
            feedback.type === 'success'
              ? 'bg-secondary-container/50 border-secondary text-on-secondary-container'
              : 'bg-error-container/60 border-error text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="flex-1">{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-headline-md font-headline-md font-bold text-on-surface">Frota Operacional</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Retirada, devolução e apontamentos de manutenção
          </p>
        </div>
      </div>

      {/* SEÇÃO: VEÍCULO EM USO PELO USUÁRIO */}
      {myVehicle && (
        <section className="space-y-3">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 shadow-sm border-l-4 border-l-secondary relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 text-surface-container-highest opacity-30 transform rotate-12 transition-transform duration-500 group-hover:scale-110 pointer-events-none">
              <span className="material-symbols-outlined text-8xl">directions_car</span>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-label-bold font-label-bold uppercase text-[10px]">
                    Em Sua Posse
                  </span>
                  <span className="text-on-surface-variant text-body-sm font-body-sm">
                    {new Date(myActiveUsage!.pickedUpAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h2 className="text-headline-md font-headline-md font-bold text-on-surface">{myVehicle.name}</h2>
                <p className="text-on-surface-variant text-body-md font-mono mt-0.5">{myVehicle.plate}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReturnVehicle(myVehicle)}
                  disabled={operatingVehicleId === myVehicle.id}
                  className="flex-1 bg-navy-deep text-white hover:bg-slate-serious active:scale-98 transition-all px-4 py-3 min-h-[48px] rounded-xl font-bold flex items-center justify-center gap-2 shadow-soft"
                >
                  <span className="material-symbols-outlined text-[20px]">keyboard_return</span>
                  Devolver Veículo
                </button>

                <button
                  onClick={() => setSelectedVehicle(myVehicle)}
                  className="px-3 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold flex items-center justify-center shadow-xs"
                  title="Reportar problema"
                >
                  <span className="material-symbols-outlined text-[20px]">build</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO: VEÍCULOS NA GARAGEM */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-headline-md font-headline-md font-bold text-on-surface">
            Veículos na Garagem
          </h2>
          <span className="text-on-surface-variant text-body-sm font-semibold bg-surface-container-lowest border border-surface-variant px-3 py-1 rounded-full text-xs">
            {vehicles.length} veículos
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
            Carregando frota...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {vehicles.map((v) => {
              const currentUsage = activeUsages.find((u) => u.vehicleId === v.id && u.status === 'IN_USE');
              const isAvailable = v.status === 'GARAGE' && !currentUsage;
              const hasMaintenance = pendingNotes.some((n) => n.vehicleId === v.id);
              const isMyCar = currentUsage && currentUsage.userId === user?.id;

              return (
                <div
                  key={v.id}
                  className={`bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 flex flex-col gap-3 shadow-xs transition-all border-l-4 ${
                    isAvailable
                      ? 'border-l-primary-container'
                      : isMyCar
                      ? 'border-l-secondary'
                      : 'border-l-outline'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-label-bold font-label-bold uppercase text-[10px] ${
                            isAvailable
                              ? 'bg-primary-container text-on-yellow-text'
                              : isMyCar
                              ? 'bg-secondary text-white'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {isAvailable
                            ? 'Disponível'
                            : isMyCar
                            ? 'Com Você'
                            : currentUsage?.driverName
                            ? `Em Uso (${currentUsage.driverName.split(' ')[0]})`
                            : 'Em Rota'}
                        </span>
                        {hasMaintenance && (
                          <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">build</span>
                            Aviso
                          </span>
                        )}
                      </div>
                      <h3 className="text-body-lg font-body-lg font-bold text-on-surface">{v.name}</h3>
                      <p className="text-on-surface-variant text-body-sm font-mono">{v.plate}</p>
                    </div>

                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
                      local_shipping
                    </span>
                  </div>

                  <div className="pt-3 border-t border-surface-variant flex gap-2">
                    {isAvailable ? (
                      <button
                        onClick={() => setPickupVehicle(v)}
                        disabled={operatingVehicleId === v.id}
                        className="flex-1 bg-primary-container hover:brightness-95 text-on-yellow-text active:scale-98 transition-all px-4 py-2.5 min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        Retirar Carro
                      </button>
                    ) : isMyCar ? (
                      <button
                        onClick={() => setReturnVehicle(v)}
                        className="flex-1 bg-navy-deep text-white hover:bg-slate-serious active:scale-98 transition-all px-4 py-2.5 min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                        Devolver à Garagem
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 bg-surface-container text-outline px-4 py-2.5 min-h-[44px] rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed text-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        Indisponível no Momento
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedVehicle(v)}
                      className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold flex items-center justify-center"
                      title="Apontar observação"
                    >
                      <span className="material-symbols-outlined text-[18px]">report_problem</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DE RETIRADA */}
      {pickupVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-surface-variant pb-3">
              <h3 className="text-headline-md font-bold text-on-surface">Retirar Veículo</h3>
              <button onClick={() => setPickupVehicle(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-surface-container p-3 rounded-xl">
              <p className="font-bold text-on-surface">{pickupVehicle.name}</p>
              <p className="text-body-sm text-on-surface-variant font-mono">{pickupVehicle.plate}</p>
            </div>

            <div className="space-y-3 text-body-sm">
              <div>
                <label className="block font-semibold text-on-surface mb-1">Km Atual (Hodômetro)</label>
                <input
                  type="number"
                  placeholder="Ex: 45200"
                  value={pickupKm}
                  onChange={(e) => setPickupKm(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Nível de Combustível</label>
                <select
                  value={pickupFuel}
                  onChange={(e) => setPickupFuel(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none"
                >
                  <option value="100%">100% (Cheio)</option>
                  <option value="75%">75% (3/4)</option>
                  <option value="50%">50% (Meio)</option>
                  <option value="25%">25% (1/4)</option>
                  <option value="Reserva">Reserva</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPickupVehicle(null)}
                className="flex-1 py-2.5 border border-surface-variant rounded-xl font-bold text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePickupConfirm}
                disabled={operatingVehicleId === pickupVehicle.id}
                className="flex-1 py-2.5 bg-primary-container text-on-yellow-text hover:brightness-95 rounded-xl font-bold shadow-soft"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUÇÃO */}
      {returnVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-surface-variant pb-3">
              <h3 className="text-headline-md font-bold text-on-surface">Devolver à Garagem</h3>
              <button onClick={() => setReturnVehicle(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-surface-container p-3 rounded-xl">
              <p className="font-bold text-on-surface">{returnVehicle.name}</p>
              <p className="text-body-sm text-on-surface-variant font-mono">{returnVehicle.plate}</p>
            </div>

            <div className="space-y-3 text-body-sm">
              <div>
                <label className="block font-semibold text-on-surface mb-1">Km Final (Opcional)</label>
                <input
                  type="number"
                  placeholder="Ex: 45350"
                  value={returnKm}
                  onChange={(e) => setReturnKm(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Observações da Devolução</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Carro limpo, abastecido, estacionado na vaga 2..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full p-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnVehicle(null)}
                className="flex-1 py-2.5 border border-surface-variant rounded-xl font-bold text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                disabled={operatingVehicleId === returnVehicle.id}
                className="flex-1 py-2.5 bg-navy-deep text-white hover:bg-slate-serious rounded-xl font-bold shadow-soft"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE OBSERVAÇÃO / APONTAMENTO DE AVARIA */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-surface-variant pb-3">
              <h3 className="text-headline-md font-bold text-on-surface">Apontamento de Manutenção</h3>
              <button onClick={() => setSelectedVehicle(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-surface-container p-3 rounded-xl">
              <p className="font-bold text-on-surface">{selectedVehicle.name}</p>
              <p className="text-body-sm text-on-surface-variant font-mono">{selectedVehicle.plate}</p>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3 text-body-sm">
              <div>
                <label className="block font-semibold text-on-surface mb-1">Categoria *</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as VehicleNoteCategory)}
                  className="w-full h-11 px-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none"
                >
                  <option value="GENERAL">{getCategoryDisplayName('GENERAL')}</option>
                  <option value="OIL">{getCategoryDisplayName('OIL')}</option>
                  <option value="BRAKES">{getCategoryDisplayName('BRAKES')}</option>
                  <option value="TIRES">{getCategoryDisplayName('TIRES')}</option>
                  <option value="LIGHTS">{getCategoryDisplayName('LIGHTS')}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Descrição do Problema / Nota *</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Pneu dianteiro direito com calibragem baixa ou barulho na embreagem..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-3 rounded-lg border border-surface-variant bg-surface-container-lowest text-on-surface focus:border-navy-deep outline-none text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 py-2.5 border border-surface-variant rounded-xl font-bold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingNote || !noteText.trim()}
                  className="flex-1 py-2.5 bg-navy-deep text-white hover:bg-slate-serious rounded-xl font-bold shadow-soft disabled:opacity-50"
                >
                  {submittingNote ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
