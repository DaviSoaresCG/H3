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
    <div className="space-y-6 w-full">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`w-full p-3.5 rounded-lg border text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn shadow-soft ${
            feedback.type === 'success'
              ? 'bg-secondary-container/40 border-secondary text-on-secondary-container'
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
          <h1 className="text-headline-md font-headline-md font-bold text-navy-deep">Frota Operacional</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Retirada, devolução e apontamentos de manutenção
          </p>
        </div>
      </div>

      {/* SEÇÃO: VEÍCULO EM USO PELO USUÁRIO */}
      {myVehicle && (
        <section className="space-y-3">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft border-l-4 border-l-secondary relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 text-surface-container-highest opacity-40 transform rotate-12 transition-transform duration-500 group-hover:scale-110 pointer-events-none">
              <span className="material-symbols-outlined text-8xl">directions_car</span>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-label-bold font-label-bold uppercase">
                    Em Sua Posse
                  </span>
                  <span className="text-on-surface-variant text-body-sm font-body-sm">
                    {new Date(myActiveUsage!.pickedUpAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">{myVehicle.name}</h2>
                <p className="text-on-surface-variant text-body-md font-mono mt-0.5">{myVehicle.plate}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReturnVehicle(myVehicle)}
                  disabled={operatingVehicleId === myVehicle.id}
                  className="flex-1 bg-navy-deep text-on-primary hover:bg-slate-serious active:scale-98 transition-all px-4 py-3 min-h-[48px] rounded-lg font-bold flex items-center justify-center gap-2 shadow-soft"
                >
                  <span className="material-symbols-outlined text-[20px]">keyboard_return</span>
                  Devolver Veículo
                </button>

                <button
                  onClick={() => setSelectedVehicle(myVehicle)}
                  className="px-3 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep rounded-lg font-bold flex items-center justify-center shadow-sm"
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
          <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
            Veículos na Garagem
          </h2>
          <span className="text-on-surface-variant text-body-sm font-semibold bg-surface-container px-3 py-1 rounded-full">
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
                  className={`bg-surface-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-all border-l-4 ${
                    isAvailable
                      ? 'border-l-success-vibrant'
                      : isMyCar
                      ? 'border-l-secondary'
                      : 'border-l-alert-warning'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-label-bold font-label-bold uppercase ${
                            isAvailable
                              ? 'bg-secondary-container text-on-secondary-container'
                              : isMyCar
                              ? 'bg-secondary text-white'
                              : 'bg-surface-container-high text-on-surface-variant'
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
                          <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">build</span>
                            Aviso
                          </span>
                        )}
                      </div>
                      <h3 className="text-body-lg font-body-lg font-bold text-navy-deep">{v.name}</h3>
                      <p className="text-on-surface-variant text-body-sm font-mono">{v.plate}</p>
                    </div>

                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
                      local_shipping
                    </span>
                  </div>

                  <div className="pt-3 border-t border-border-subtle flex gap-2">
                    {isAvailable ? (
                      <button
                        onClick={() => setPickupVehicle(v)}
                        disabled={operatingVehicleId === v.id}
                        className="flex-1 bg-surface-container-lowest hover:bg-surface-container border border-border-subtle text-navy-deep active:scale-98 transition-all px-4 py-2.5 min-h-[44px] rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        Retirar Carro
                      </button>
                    ) : isMyCar ? (
                      <button
                        onClick={() => setReturnVehicle(v)}
                        className="flex-1 bg-navy-deep text-white hover:bg-slate-serious active:scale-98 transition-all px-4 py-2.5 min-h-[44px] rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                        Devolver à Garagem
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 bg-surface-container text-outline px-4 py-2.5 min-h-[44px] rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        Indisponível no Momento
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedVehicle(v)}
                      className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-navy-deep rounded-lg font-bold flex items-center justify-center"
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
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Retirar {pickupVehicle.name}</h3>
                <p className="text-body-sm text-on-surface-variant font-mono">{pickupVehicle.plate}</p>
              </div>
              <button onClick={() => setPickupVehicle(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Quilometragem Inicial (KM)
                </label>
                <input
                  type="number"
                  value={pickupKm}
                  onChange={(e) => setPickupKm(e.target.value)}
                  placeholder="Ex: 45230"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Nível de Combustível
                </label>
                <select
                  value={pickupFuel}
                  onChange={(e) => setPickupFuel(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                >
                  <option value="100%">Tanque Cheio (100%)</option>
                  <option value="75%">3/4 Tanque (75%)</option>
                  <option value="50%">1/2 Tanque (50%)</option>
                  <option value="25%">1/4 Tanque (25%)</option>
                  <option value="RESERVA">Reserva</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setPickupVehicle(null)}
                className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePickupConfirm}
                disabled={operatingVehicleId === pickupVehicle.id}
                className="flex-1 py-3 bg-secondary text-white font-bold rounded-lg shadow-soft active:translate-y-px"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUÇÃO */}
      {returnVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Devolver {returnVehicle.name}</h3>
                <p className="text-body-sm text-on-surface-variant font-mono">{returnVehicle.plate}</p>
              </div>
              <button onClick={() => setReturnVehicle(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Quilometragem Final (KM)
                </label>
                <input
                  type="number"
                  value={returnKm}
                  onChange={(e) => setReturnKm(e.target.value)}
                  placeholder="Ex: 45310"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Observações ou Avarias (Opcional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Veículo abastecido, pneu dianteiro calibrado..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setReturnVehicle(null)}
                className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                disabled={operatingVehicleId === returnVehicle.id}
                className="flex-1 py-3 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE APONTAMENTO DE MANUTENÇÃO */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Apontar Ocorrência</h3>
                <p className="text-body-sm text-on-surface-variant font-mono">{selectedVehicle.name} ({selectedVehicle.plate})</p>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Categoria da Ocorrência
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as VehicleNoteCategory)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                >
                  <option value="GENERAL">Geral / Diversos</option>
                  <option value="OIL">Troca de Óleo / Filtro</option>
                  <option value="BRAKES">Freios / Pastilhas</option>
                  <option value="TIRES">Pneus / Alinhamento</option>
                  <option value="LIGHTS">Faróis / Lanternas</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Descrição do Problema *
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Descreva o barulho, defeito ou revisão necessária..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingNote || !noteText.trim()}
                  className="flex-1 py-3 bg-alert-warning hover:brightness-105 text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  Salvar Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
