'use client';

import { useState, useEffect, useCallback } from 'react';
import { Vehicle, VehicleNoteWithDetails, VehicleUsageWithDetails, VehicleNoteCategory, VehicleStatus } from '@/types';
import { getCategoryDisplayName } from '@/lib/maintenance-validator';

export default function AdminFrotaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeUsages, setActiveUsages] = useState<VehicleUsageWithDetails[]>([]);
  const [notes, setNotes] = useState<VehicleNoteWithDetails[]>([]);
  const [noteFilter, setNoteFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [resolvingNoteId, setResolvingNoteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para cadastrar veículo
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleStatus, setNewVehicleStatus] = useState<VehicleStatus>('GARAGE');
  const [submittingVehicle, setSubmittingVehicle] = useState(false);

  // Modal para editar veículo
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehicleName, setEditVehicleName] = useState('');
  const [editVehiclePlate, setEditVehiclePlate] = useState('');
  const [editVehicleStatus, setEditVehicleStatus] = useState<VehicleStatus>('GARAGE');
  const [submittingEditVehicle, setSubmittingEditVehicle] = useState(false);

  // Confirmação para excluir veículo
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [submittingDeleteVehicle, setSubmittingDeleteVehicle] = useState(false);

  // Modal para criar nota pelo Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteVehicleId, setNewNoteVehicleId] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<VehicleNoteCategory>('GENERAL');
  const [newNoteText, setNewNoteText] = useState('');
  const [submittingCreateNote, setSubmittingCreateNote] = useState(false);

  const fetchAdminFleet = useCallback(async () => {
    try {
      const resFrota = await fetch('/api/admin/vehicles');
      const dataFrota = await resFrota.json();
      if (dataFrota.success) {
        setVehicles(dataFrota.vehicles || []);
        if (dataFrota.vehicles?.length > 0 && !newNoteVehicleId) {
          setNewNoteVehicleId(dataFrota.vehicles[0].id);
        }
      }

      const resFleetUsages = await fetch('/api/frota');
      const dataFleetUsages = await resFleetUsages.json();
      if (dataFleetUsages.success) {
        setActiveUsages(dataFleetUsages.activeUsages || []);
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

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleName.trim() || !newVehiclePlate.trim()) return;

    setSubmittingVehicle(true);
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVehicleName.trim(),
          plate: newVehiclePlate.trim().toUpperCase(),
          status: newVehicleStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar veículo');
      }

      setFeedback({ type: 'success', text: 'Veículo adicionado à frota com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setShowVehicleModal(false);
      setNewVehicleName('');
      setNewVehiclePlate('');
      setNewVehicleStatus('GARAGE');
      await fetchAdminFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao cadastrar veículo' });
    } finally {
      setSubmittingVehicle(false);
    }
  };

  const handleOpenEditVehicle = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setEditVehicleName(veh.name);
    setEditVehiclePlate(veh.plate);
    setEditVehicleStatus(veh.status);
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !editVehicleName.trim() || !editVehiclePlate.trim()) return;

    setSubmittingEditVehicle(true);
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVehicle.id,
          name: editVehicleName.trim(),
          plate: editVehiclePlate.trim().toUpperCase(),
          status: editVehicleStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar veículo');
      }

      setFeedback({ type: 'success', text: 'Dados do veículo atualizados com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setEditingVehicle(null);
      await fetchAdminFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao atualizar veículo' });
    } finally {
      setSubmittingEditVehicle(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;

    setSubmittingDeleteVehicle(true);
    try {
      const res = await fetch(`/api/admin/vehicles?id=${deletingVehicle.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir veículo');
      }

      setFeedback({ type: 'success', text: 'Veículo removido da frota com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setDeletingVehicle(null);
      await fetchAdminFleet();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao excluir veículo' });
    } finally {
      setSubmittingDeleteVehicle(false);
    }
  };

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

      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
            Gestão da Frota de Veículos
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Cadastro de veículos, monitoramento em tempo real e controle de manutenção preventiva.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVehicleModal(true)}
            className="bg-navy-deep hover:bg-slate-serious text-on-primary px-4 py-2.5 rounded-lg font-bold text-body-sm transition-all shadow-soft flex items-center gap-2 active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Cadastrar Veículo</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-surface-card hover:bg-surface-container border border-border-subtle text-navy-deep px-4 py-2.5 rounded-lg font-bold text-body-sm transition-all shadow-soft flex items-center gap-2 active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
            <span>Alerta Manutenção</span>
          </button>
        </div>
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
            <p className="text-body-sm text-on-surface-variant font-medium">Em Trânsito / Viagem</p>
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
                        <h3 className="font-bold text-body-lg text-navy-deep">{v.name}</h3>
                        <span className="font-mono text-body-sm text-on-surface-variant font-bold">
                          {v.plate}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded text-label-bold font-label-bold uppercase ${
                          isAvailable
                            ? 'bg-secondary-container text-on-secondary-container'
                            : v.status === 'TRIP'
                            ? 'bg-primary-container text-white'
                            : 'bg-alert-warning/20 text-alert-warning'
                        }`}
                      >
                        {isAvailable ? 'Garagem (Livre)' : v.status === 'TRIP' ? 'Em Viagem' : 'Na Rua (Em Uso)'}
                      </span>
                    </div>

                    <div className="bg-surface-container-low p-3 rounded-lg text-xs space-y-1.5 text-on-surface-variant">
                      <div className="flex justify-between">
                        <span>Motorista Atual:</span>
                        <span className="font-semibold text-navy-deep">{driverName}</span>
                      </div>
                      {usage && (
                        <div className="flex justify-between">
                          <span>Saída:</span>
                          <span className="font-semibold text-navy-deep">
                            {new Date(usage.pickedUpAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {vehiclePendingNotes.length > 0 && (
                      <div className="p-2.5 bg-alert-warning/10 border border-alert-warning/30 rounded-lg text-xs flex items-center gap-2 text-alert-warning font-semibold">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        <span>{vehiclePendingNotes.length} problema(s) pendente(s)</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditVehicle(v)}
                      className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-navy-deep text-xs font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeletingVehicle(v)}
                      className="px-2.5 py-1.5 text-error hover:bg-error-container/40 text-xs font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção de Manutenções e Ocorrências */}
      <section className="space-y-4 pt-4 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
              Histórico & Alertas de Manutenção
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Registro de avarias, quilometragem, combustível e revisões reportadas pela equipe.
            </p>
          </div>

          <div className="flex bg-surface-container p-1 rounded-lg border border-border-subtle self-start">
            <button
              onClick={() => setNoteFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                noteFilter === 'PENDING' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Pendentes ({notes.filter((n) => !n.isResolved).length})
            </button>
            <button
              onClick={() => setNoteFilter('RESOLVED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                noteFilter === 'RESOLVED' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Resolvidas
            </button>
            <button
              onClick={() => setNoteFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                noteFilter === 'ALL' ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-12 text-center text-on-surface-variant space-y-2 shadow-soft">
            <span className="material-symbols-outlined text-4xl text-slate-serious">check_circle</span>
            <p className="text-navy-deep font-bold text-body-md">Nenhuma ocorrência encontrada.</p>
            <p className="text-on-surface-variant text-body-sm">A frota está em dia sem avisos pendentes neste filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft space-y-3 border-l-4 ${
                  note.isResolved ? 'border-l-slate-serious opacity-80' : 'border-l-alert-warning'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-label-bold font-label-bold uppercase bg-surface-container text-navy-deep text-[11px]">
                        {getCategoryDisplayName(note.category)}
                      </span>
                      <span className="font-bold text-navy-deep text-body-md">{note.vehicleName}</span>
                      <span className="text-on-surface-variant text-xs font-mono font-bold">({note.plate})</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Relatado por <strong>{note.reportedBy}</strong> em{' '}
                      {new Date(note.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-label-bold font-label-bold uppercase text-[11px] ${
                      note.isResolved
                        ? 'bg-surface-container text-on-surface-variant'
                        : 'bg-alert-warning/20 text-alert-warning'
                    }`}
                  >
                    {note.isResolved ? 'Resolvido' : 'Pendente'}
                  </span>
                </div>

                <p className="text-body-sm text-on-surface bg-surface-container-low p-3 rounded-lg">
                  {note.noteText}
                </p>

                {!note.isResolved && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleResolveNote(note.id)}
                      disabled={resolvingNoteId === note.id}
                      className="px-3 py-1.5 bg-secondary text-on-secondary rounded-lg font-bold text-xs shadow-soft hover:brightness-110 active:translate-y-px transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">done_all</span>
                      <span>{resolvingNoteId === note.id ? 'Baixando...' : 'Marcar como Resolvido'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Cadastrar Veículo */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Cadastrar Novo Veículo</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Modelo / Identificação do Veículo *
                </label>
                <input
                  type="text"
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  placeholder="Ex: Fiorino 04, Ducato Carga, Master..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC-1234 ou ABC1D23"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono uppercase text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Status Inicial
                </label>
                <select
                  value={newVehicleStatus}
                  onChange={(e) => setNewVehicleStatus(e.target.value as VehicleStatus)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                >
                  <option value="GARAGE">Na Garagem (Disponível)</option>
                  <option value="ON_ROAD">Na Rua (Em Trânsito)</option>
                  <option value="TRIP">Em Viagem Agendada</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingVehicle}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingVehicle ? 'Salvando...' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Veículo */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Editar Veículo</h3>
              <button onClick={() => setEditingVehicle(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditVehicle} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Modelo / Identificação *
                </label>
                <input
                  type="text"
                  value={editVehicleName}
                  onChange={(e) => setEditVehicleName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  value={editVehiclePlate}
                  onChange={(e) => setEditVehiclePlate(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono uppercase text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Status Atual
                </label>
                <select
                  value={editVehicleStatus}
                  onChange={(e) => setEditVehicleStatus(e.target.value as VehicleStatus)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                >
                  <option value="GARAGE">Na Garagem (Disponível)</option>
                  <option value="ON_ROAD">Na Rua (Em Trânsito)</option>
                  <option value="TRIP">Em Viagem Agendada</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEditVehicle}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingEditVehicle ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão de Veículo */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-headline-md font-bold text-navy-deep">Excluir Veículo?</h3>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Deseja realmente remover o veículo <strong>"{deletingVehicle.name}"</strong> ({deletingVehicle.plate}) da frota?
            </p>

            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleDeleteVehicle}
                disabled={submittingDeleteVehicle}
                className="flex-1 py-2.5 bg-error text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
              >
                {submittingDeleteVehicle ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Alerta Manutenção */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
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
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.plate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Categoria *</label>
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value as VehicleNoteCategory)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                >
                  <option value="DAMAGE">Avaria / Danos</option>
                  <option value="MAINTENANCE">Manutenção Mecânica</option>
                  <option value="TIRES">Pneus / Calibragem</option>
                  <option value="FUEL">Combustível</option>
                  <option value="KM">Quilometragem</option>
                  <option value="GENERAL">Geral / Limpeza</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Descrição do Problema *</label>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Descreva o detalhe técnico da manutenção..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none h-24 resize-none"
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
                  disabled={submittingCreateNote}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingCreateNote ? 'Salvando...' : 'Salvar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
