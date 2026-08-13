'use client';

import { useState, useEffect, useCallback } from 'react';
import { Vehicle, VehicleNoteWithDetails, VehicleUsageWithDetails, VehicleNoteCategory } from '@/types';
import { getCategoryDisplayName } from '@/lib/maintenance-validator';

export default function AdminFrotaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeUsages, setActiveUsages] = useState<VehicleUsageWithDetails[]>([]);
  const [notes, setNotes] = useState<VehicleNoteWithDetails[]>([]);
  const [noteFilter, setNoteFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [resolvingNoteId, setResolvingNoteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para criar nota pelo Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteVehicleId, setNewNoteVehicleId] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<VehicleNoteCategory>('GENERAL');
  const [newNoteText, setNewNoteText] = useState('');
  const [submittingCreateNote, setSubmittingCreateNote] = useState(false);

  const fetchAdminFleet = useCallback(async () => {
    try {
      const resFrota = await fetch('/api/frota');
      const dataFrota = await resFrota.json();
      if (dataFrota.success) {
        setVehicles(dataFrota.vehicles || []);
        setActiveUsages(dataFrota.activeUsages || []);
        if (dataFrota.vehicles?.length > 0 && !newNoteVehicleId) {
          setNewNoteVehicleId(dataFrota.vehicles[0].id);
        }
      }

      const resNotes = await fetch(`/api/frota/notes?status=${noteFilter}`);
      const dataNotes = await resNotes.json();
      if (dataNotes.success) {
        setNotes(dataNotes.notes || []);
      }
    } catch (e) {
      console.error('Erro ao buscar dados da frota:', e);
    } finally {
      setLoading(false);
    }
  }, [noteFilter, newNoteVehicleId]);

  useEffect(() => {
    fetchAdminFleet();
  }, [fetchAdminFleet]);

  const handleResolveNote = async (noteId: string) => {
    setResolvingNoteId(noteId);
    try {
      const res = await fetch('/api/frota/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao dar baixa');
      }

      setFeedback({ type: 'success', text: 'Manutenção marcada como resolvida com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      await fetchAdminFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao dar baixa na manutenção' });
    } finally {
      setResolvingNoteId(null);
    }
  };

  const handleCreateNoteByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteVehicleId || !newNoteText.trim()) return;
    setSubmittingCreateNote(true);

    try {
      const res = await fetch('/api/frota/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: newNoteVehicleId,
          category: newNoteCategory,
          noteText: newNoteText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar observação');
      }

      setFeedback({ type: 'success', text: 'Novo alerta de manutenção registrado com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setShowCreateModal(false);
      setNewNoteText('');
      await fetchAdminFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao salvar alerta de manutenção' });
    } finally {
      setSubmittingCreateNote(false);
    }
  };

  const vehiclesInGarage = vehicles.filter((v) => v.status === 'GARAGE').length;
  const vehiclesOnRoad = vehicles.filter((v) => v.status === 'ON_ROAD' || v.status === 'TRIP').length;
  const pendingAlertsCount = notes.filter((n) => !n.isResolved).length;

  return (
    <div className="space-y-6">
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

      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
            Gestão da Frota de Veículos
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Monitoramento de veículos na garagem, em rota e controle de manutenção preventiva.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-navy-deep hover:bg-slate-serious text-on-primary px-4 py-2.5 rounded-lg font-bold text-body-sm transition-all shadow-soft flex items-center gap-2 active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">add_alert</span>
          <span>Novo Alerta de Manutenção</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">local_shipping</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Total Frota</p>
            <p className="text-2xl font-bold text-navy-deep">{vehicles.length}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-success-vibrant">
          <div className="w-12 h-12 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              garage
            </span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Na Garagem</p>
            <p className="text-2xl font-bold text-secondary">{vehiclesInGarage}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-navy-deep">
          <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">directions_car</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Em Trânsito / Rota</p>
            <p className="text-2xl font-bold text-navy-deep">{vehiclesOnRoad}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-alert-warning">
          <div className="w-12 h-12 rounded-lg bg-alert-warning/10 flex items-center justify-center text-alert-warning">
            <span className="material-symbols-outlined text-[24px]">build</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Alertas Manutenção</p>
            <p className="text-2xl font-bold text-alert-warning">{pendingAlertsCount}</p>
          </div>
        </div>
      </div>

      {/* Grid de Veículos */}
      <section className="space-y-3">
        <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">Status da Frota em Tempo Real</h2>
        
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
            Carregando frota...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const usage = activeUsages.find((u) => u.vehicleId === v.id);
              const driverName = usage?.driverName || 'Nenhum motorista';
              const vehiclePendingNotes = notes.filter((n) => n.vehicleId === v.id && !n.isResolved);
              const isAvailable = v.status === 'GARAGE' && !usage;

              return (
                <div
                  key={v.id}
                  className={`bg-surface-card border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-soft border-l-4 ${
                    isAvailable
                      ? 'border-l-success-vibrant'
                      : v.status === 'TRIP'
                      ? 'border-l-secondary'
                      : 'border-l-alert-warning'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-label-bold font-label-bold uppercase ${
                            isAvailable
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-surface-container-high text-navy-deep'
                          }`}
                        >
                          {isAvailable ? 'Na Garagem' : v.status === 'TRIP' ? 'Em Viagem' : 'Em Rota'}
                        </span>
                        <h3 className="text-body-lg font-bold text-navy-deep mt-1.5">{v.name}</h3>
                        <p className="text-on-surface-variant text-body-sm font-mono">{v.plate}</p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-navy-deep">
                        <span className="material-symbols-outlined text-[22px]">directions_car</span>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-lg space-y-1 text-body-sm">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Condutor atual:</span>
                        <span className="font-semibold text-navy-deep">{driverName}</span>
                      </div>
                      {usage && (
                        <div className="flex justify-between text-on-surface-variant">
                          <span>Retirado às:</span>
                          <span className="font-mono text-navy-deep">
                            {new Date(usage.pickedUpAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {vehiclePendingNotes.length > 0 && (
                      <div className="p-2.5 bg-error-container/40 border border-error/20 rounded-lg text-body-sm text-on-error-container space-y-1">
                        <div className="flex items-center gap-1 font-bold text-xs uppercase">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          {vehiclePendingNotes.length} aviso(s) de manutenção
                        </div>
                        <p className="text-xs line-clamp-2">{vehiclePendingNotes[0].noteText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Painel de Alertas de Manutenção */}
      <section className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-alert-warning text-[24px]">build</span>
            <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
              Histórico & Ocorrências de Manutenção
            </h2>
          </div>

          <div className="flex rounded-lg bg-surface-container p-1 text-xs font-bold">
            <button
              onClick={() => setNoteFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                noteFilter === 'PENDING' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Pendentes ({notes.filter((n) => !n.isResolved).length})
            </button>
            <button
              onClick={() => setNoteFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                noteFilter === 'RESOLVED' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Resolvidos
            </button>
            <button
              onClick={() => setNoteFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                noteFilter === 'ALL' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="text-center py-8 text-on-surface-variant text-body-sm">
            Nenhuma ocorrência encontrada para este filtro.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {notes.map((n) => (
              <div key={n.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy-deep text-body-md">{n.vehicleName} ({n.plate})</span>
                    <span className="px-2 py-0.5 rounded text-label-caps font-label-caps uppercase bg-surface-container text-navy-deep font-bold">
                      {getCategoryDisplayName(n.category)}
                    </span>
                    {n.isResolved ? (
                      <span className="px-2 py-0.5 rounded text-label-caps font-label-caps uppercase bg-secondary-container text-on-secondary-container">
                        Resolvido
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-label-caps font-label-caps uppercase bg-error-container text-on-error-container">
                        Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{n.noteText}</p>
                  <p className="text-[11px] text-outline">
                    Registrado por {n.reportedBy || 'Motorista'} em {new Date(n.createdAt).toLocaleDateString('pt-BR')} às {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {!n.isResolved && (
                  <button
                    onClick={() => handleResolveNote(n.id)}
                    disabled={resolvingNoteId === n.id}
                    className="px-3 py-1.5 bg-secondary hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm active:translate-y-px transition-all flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    {resolvingNoteId === n.id ? 'Baixando...' : 'Dar Baixa'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Criar Alerta Admin */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-lg rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Novo Alerta de Manutenção</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNoteByAdmin} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Veículo *</label>
                <select
                  value={newNoteVehicleId}
                  onChange={(e) => setNewNoteVehicleId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Categoria *</label>
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value as VehicleNoteCategory)}
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
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Descrição do Alerta *</label>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={3}
                  placeholder="Ex: Veículo precisa trocar pastilha de freio antes do próximo evento..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreateNote || !newNoteText.trim()}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
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
