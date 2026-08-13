'use client';

import { useState, useEffect, useCallback } from 'react';
import { TripWithDetails, Vehicle, User, TripStatus } from '@/types';
import { calculateTripDays, calculateTripAllowance } from '@/lib/trip-validator';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';
import { formatDateBR } from '@/lib/date-utils';

export default function AdminViagensPage() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

  // Modal para agendar nova viagem
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [submittingTrip, setSubmittingTrip] = useState(false);

  // Modal para editar viagem existente
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTripId, setEditTripId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDestinationCity, setEditDestinationCity] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>([]);
  const [editVehicleIds, setEditVehicleIds] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal de confirmação de cancelamento
  const [cancelingTrip, setCancelingTrip] = useState<TripWithDetails | null>(null);

  const fetchTripsData = useCallback(async () => {
    try {
      const resTrips = await fetch('/api/viagens');
      const dataTrips = await resTrips.json();
      if (dataTrips.success) {
        setTrips(dataTrips.trips || []);
      }

      const resFleet = await fetch('/api/frota');
      const dataFleet = await resFleet.json();
      if (dataFleet.success) {
        setVehicles(dataFleet.vehicles || []);
      }

      const resEmp = await fetch('/api/admin/employees');
      const dataEmp = await resEmp.json();
      if (dataEmp.success && dataEmp.employees) {
        setEmployees(dataEmp.employees);
      }
    } catch (e) {
      console.error('Erro ao buscar dados de viagens:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTripsData();
  }, [fetchTripsData]);

  // Cálculos preview para criação
  let previewDays = 0;
  if (startDate && endDate) {
    try {
      previewDays = calculateTripDays(startDate, endDate);
    } catch {
      previewDays = 0;
    }
  }
  const individualAllowanceCentavos = calculateTripAllowance(previewDays, DAILY_TRAVEL_ALLOWANCE_CENTAVOS);
  const totalTripBudgetCentavos = selectedParticipantIds.length * individualAllowanceCentavos;

  // Cálculos preview para edição
  let editPreviewDays = 0;
  if (editStartDate && editEndDate) {
    try {
      editPreviewDays = calculateTripDays(editStartDate, editEndDate);
    } catch {
      editPreviewDays = 0;
    }
  }
  const editIndividualAllowanceCentavos = calculateTripAllowance(editPreviewDays, DAILY_TRAVEL_ALLOWANCE_CENTAVOS);
  const editTotalTripBudgetCentavos = editParticipantIds.length * editIndividualAllowanceCentavos;

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destinationCity.trim() || !startDate || !endDate) return;
    if (selectedParticipantIds.length === 0) {
      alert('Selecione pelo menos um colaborador para a viagem.');
      return;
    }

    setSubmittingTrip(true);
    try {
      const res = await fetch('/api/viagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          destinationCity,
          startDate,
          endDate,
          participantIds: selectedParticipantIds,
          vehicleIds: selectedVehicleIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao agendar viagem');
      }

      setFeedback({ type: 'success', text: 'Viagem cadastrada com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setShowCreateModal(false);
      setTitle('');
      setDestinationCity('');
      setStartDate('');
      setEndDate('');
      setSelectedParticipantIds([]);
      setSelectedVehicleIds([]);
      await fetchTripsData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao agendar viagem' });
    } finally {
      setSubmittingTrip(false);
    }
  };

  const handleOpenEdit = (trip: TripWithDetails) => {
    setEditTripId(trip.id);
    setEditTitle(trip.title);
    setEditDestinationCity(trip.destinationCity);
    setEditStartDate(trip.startDate);
    setEditEndDate(trip.endDate);
    setEditParticipantIds(trip.participants.map((p) => p.userId));
    setEditVehicleIds(trip.vehicles ? trip.vehicles.map((v) => v.vehicleId) : []);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDestinationCity.trim() || !editStartDate || !editEndDate) return;
    if (editParticipantIds.length === 0) {
      alert('Selecione pelo menos um colaborador para a viagem.');
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch('/api/viagens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: editTripId,
          title: editTitle,
          destinationCity: editDestinationCity,
          startDate: editStartDate,
          endDate: editEndDate,
          participantIds: editParticipantIds,
          vehicleIds: editVehicleIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao editar viagem');
      }

      setFeedback({ type: 'success', text: 'Viagem atualizada com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setShowEditModal(false);
      await fetchTripsData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao editar viagem' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    setUpdatingTripId(tripId);
    try {
      const res = await fetch('/api/viagens', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar viagem');
      }

      const statusLabels: Record<string, string> = {
        ACTIVE: 'Em Andamento',
        COMPLETED: 'Concluída',
        CANCELLED: 'Cancelada',
        PLANNED: 'Prevista',
      };

      setFeedback({
        type: 'success',
        text: `Status da viagem alterado para ${statusLabels[newStatus] || newStatus}!`,
      });
      setTimeout(() => setFeedback(null), 4000);
      setCancelingTrip(null);
      await fetchTripsData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao atualizar status' });
    } finally {
      setUpdatingTripId(null);
    }
  };

  const activeTripsCount = trips.filter((t) => t.status === 'ACTIVE').length;
  const plannedTripsCount = trips.filter((t) => t.status === 'PLANNED').length;
  const totalBudgetCentavos = trips
    .filter((t) => t.status !== 'CANCELLED')
    .reduce(
      (acc, t) => acc + t.participants.reduce((sum, p) => sum + p.totalAllowanceCentavos, 0),
      0
    );

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
            Gestão de Viagens & Diárias
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Despacho de equipes para eventos fora da cidade, alocação de frota e cálculo de diárias (R$ 150/dia).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-navy-deep hover:bg-slate-serious text-on-primary px-4 py-2.5 rounded-lg font-bold text-body-sm transition-all shadow-soft flex items-center gap-2 active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
          <span>Agendar Nova Viagem</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">route</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Previstas / Programadas</p>
            <p className="text-2xl font-bold text-navy-deep">{plannedTripsCount}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-secondary">
          <div className="w-12 h-12 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              flight_takeoff
            </span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Em Andamento</p>
            <p className="text-2xl font-bold text-secondary">{activeTripsCount}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-navy-deep">
          <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Custo Ativo de Diárias</p>
            <p className="text-2xl font-bold text-navy-deep">
              {(totalBudgetCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Viagens */}
      <section className="space-y-3">
        <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
          Escalas de Viagens Cadastradas
        </h2>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
            Carregando viagens...
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-12 text-center text-on-surface-variant space-y-2 shadow-soft">
            <span className="material-symbols-outlined text-4xl text-slate-serious">map</span>
            <p className="text-navy-deep font-bold text-body-md">Nenhuma viagem cadastrada.</p>
            <p className="text-on-surface-variant text-body-sm">Clique em "Agendar Nova Viagem" para iniciar uma escala.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => {
              const tripTotalBudget = trip.participants.reduce((sum, p) => sum + p.totalAllowanceCentavos, 0);
              const isActive = trip.status === 'ACTIVE';
              const isCompleted = trip.status === 'COMPLETED';
              const isCancelled = trip.status === 'CANCELLED';

              return (
                <div
                  key={trip.id}
                  className={`bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft space-y-4 border-l-4 transition-all ${
                    isActive
                      ? 'border-l-secondary'
                      : isCompleted
                      ? 'border-l-slate-serious'
                      : isCancelled
                      ? 'border-l-error opacity-75'
                      : 'border-l-navy-deep'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-label-bold font-label-bold uppercase ${
                          isActive
                            ? 'bg-secondary-container text-on-secondary-container'
                            : isCompleted
                            ? 'bg-surface-container text-outline'
                            : isCancelled
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-primary-container text-white'
                        }`}
                      >
                        {isActive
                          ? 'Em Andamento'
                          : isCompleted
                          ? 'Concluída'
                          : isCancelled
                          ? 'Cancelada'
                          : 'Prevista'}
                      </span>
                      <h3 className="text-body-lg font-bold text-navy-deep mt-2">{trip.title}</h3>
                      <p className="text-body-sm text-secondary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {trip.destinationCity}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-on-surface-variant font-bold uppercase">Orçamento Diárias</span>
                      <p className="text-body-lg font-bold text-navy-deep">
                        {(tripTotalBudget / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-lg space-y-1.5 text-xs text-on-surface-variant">
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span className="font-semibold text-navy-deep">
                        {formatDateBR(trip.startDate)} a {formatDateBR(trip.endDate)} ({trip.totalDays} dias)
                      </span>
                    </div>

                    <div>
                      <span>Equipe Escalada ({trip.participants.length}):</span>
                      <p className="font-semibold text-navy-deep mt-0.5">
                        {trip.participants.map((p) => p.userName || 'Colaborador').join(', ')}
                      </p>
                    </div>

                    {trip.vehicles && trip.vehicles.length > 0 && (
                      <div>
                        <span>Veículo(s):</span>
                        <p className="font-semibold text-navy-deep mt-0.5">
                          {trip.vehicles.map((v) => `${v.vehicleName || 'Veículo'} (${v.plate || ''})`).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações de Gestão */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => handleOpenEdit(trip)}
                          disabled={updatingTripId === trip.id}
                          className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-navy-deep text-xs font-bold rounded-lg transition shadow-sm active:translate-y-px flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => setCancelingTrip(trip)}
                          disabled={updatingTripId === trip.id}
                          className="px-2.5 py-1.5 text-error hover:bg-error-container/40 text-xs font-bold rounded-lg transition active:translate-y-px flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">cancel</span>
                          <span>Cancelar</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {trip.status === 'PLANNED' && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, 'ACTIVE')}
                          disabled={updatingTripId === trip.id}
                          className="px-3 py-1.5 bg-secondary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-secondary/90 active:translate-y-px flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                          <span>Iniciar Viagem</span>
                        </button>
                      )}

                      {trip.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, 'COMPLETED')}
                          disabled={updatingTripId === trip.id}
                          className="px-3 py-1.5 bg-navy-deep text-white text-xs font-bold rounded-lg shadow-sm hover:bg-slate-serious active:translate-y-px flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Concluir e Fechar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Criar Viagem */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-lg rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Agendar Nova Viagem</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Título do Evento / Viagem *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Montagem Festival de Verão - Santos/SP"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Cidade de Destino *</label>
                <input
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="Ex: Santos - SP, Campinas - SP..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Data Início *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Data Fim *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>
              </div>

              {previewDays > 0 && (
                <div className="p-3 bg-secondary-container/40 border border-secondary/30 rounded-lg text-xs text-on-secondary-container">
                  <p className="font-bold">Duração Estimada: {previewDays} dias</p>
                  <p>Diária Individual: R$ {(individualAllowanceCentavos / 100).toFixed(2)} por colaborador.</p>
                  <p className="font-semibold mt-1">
                    Orçamento Total Estimado: R$ {(totalTripBudgetCentavos / 100).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Seleção de Colaboradores */}
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Equipe Escalada ({selectedParticipantIds.length} selecionados) *
                </label>
                <div className="max-h-32 overflow-y-auto border border-border-subtle rounded-lg p-2 space-y-1 bg-surface-container-lowest">
                  {employees.map((emp) => {
                    const isSelected = selectedParticipantIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container cursor-pointer text-xs font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipantIds([...selectedParticipantIds, emp.id]);
                            } else {
                              setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-border-subtle text-navy-deep focus:ring-navy-deep"
                        />
                        <span>{emp.name} ({emp.role})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de Veículos */}
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Veículo(s) da Frota Vinculados
                </label>
                <div className="max-h-28 overflow-y-auto border border-border-subtle rounded-lg p-2 space-y-1 bg-surface-container-lowest">
                  {vehicles.map((v) => {
                    const isSelected = selectedVehicleIds.includes(v.id);
                    return (
                      <label
                        key={v.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container cursor-pointer text-xs font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVehicleIds([...selectedVehicleIds, v.id]);
                            } else {
                              setSelectedVehicleIds(selectedVehicleIds.filter((id) => id !== v.id));
                            }
                          }}
                          className="rounded border-border-subtle text-navy-deep focus:ring-navy-deep"
                        />
                        <span>{v.name} — {v.plate}</span>
                        {v.status !== 'GARAGE' && (
                          <span className="ml-auto text-[10px] text-on-surface-variant font-normal">
                            ({v.status === 'TRIP' ? 'Em Viagem' : 'Na Rua'})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
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
                  disabled={submittingTrip || selectedParticipantIds.length === 0}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingTrip ? 'Agendando...' : 'Confirmar Escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Viagem */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-lg rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Editar Viagem</h3>
              <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Título do Evento / Viagem *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Cidade de Destino *</label>
                <input
                  type="text"
                  value={editDestinationCity}
                  onChange={(e) => setEditDestinationCity(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Data Início *</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Data Fim *</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>
              </div>

              {editPreviewDays > 0 && (
                <div className="p-3 bg-secondary-container/40 border border-secondary/30 rounded-lg text-xs text-on-secondary-container">
                  <p className="font-bold">Duração Estimada: {editPreviewDays} dias</p>
                  <p>Diária Individual: R$ {(editIndividualAllowanceCentavos / 100).toFixed(2)} por colaborador.</p>
                  <p className="font-semibold mt-1">
                    Orçamento Total Estimado: R$ {(editTotalTripBudgetCentavos / 100).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Seleção de Colaboradores na Edição */}
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Equipe Escalada ({editParticipantIds.length} selecionados) *
                </label>
                <div className="max-h-32 overflow-y-auto border border-border-subtle rounded-lg p-2 space-y-1 bg-surface-container-lowest">
                  {employees.map((emp) => {
                    const isSelected = editParticipantIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container cursor-pointer text-xs font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditParticipantIds([...editParticipantIds, emp.id]);
                            } else {
                              setEditParticipantIds(editParticipantIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-border-subtle text-navy-deep focus:ring-navy-deep"
                        />
                        <span>{emp.name} ({emp.role})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de Veículos na Edição */}
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Veículo(s) da Frota Vinculados
                </label>
                <div className="max-h-28 overflow-y-auto border border-border-subtle rounded-lg p-2 space-y-1 bg-surface-container-lowest">
                  {vehicles.map((v) => {
                    const isSelected = editVehicleIds.includes(v.id);
                    return (
                      <label
                        key={v.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container cursor-pointer text-xs font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditVehicleIds([...editVehicleIds, v.id]);
                            } else {
                              setEditVehicleIds(editVehicleIds.filter((id) => id !== v.id));
                            }
                          }}
                          className="rounded border-border-subtle text-navy-deep focus:ring-navy-deep"
                        />
                        <span>{v.name} — {v.plate}</span>
                        {v.status !== 'GARAGE' && (
                          <span className="ml-auto text-[10px] text-on-surface-variant font-normal">
                            ({v.status === 'TRIP' ? 'Em Viagem' : 'Na Rua'})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || editParticipantIds.length === 0}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Cancelamento */}
      {cancelingTrip && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-headline-md font-bold text-navy-deep">Cancelar Viagem?</h3>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Você está prestes a cancelar a viagem <strong>"{cancelingTrip.title}"</strong> ({cancelingTrip.destinationCity}).
            </p>

            <div className="p-3 bg-error-container/40 border border-error/30 rounded-lg text-xs text-on-error-container space-y-1">
              <p className="font-bold">Ações automáticas ao cancelar:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Todos os veículos vinculados serão liberados para a garagem.</li>
                <li>As diárias previstas serão removidas do cálculo mensal.</li>
                <li>O status será marcado como Cancelada.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setCancelingTrip(null)}
                className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(cancelingTrip.id, 'CANCELLED')}
                disabled={updatingTripId === cancelingTrip.id}
                className="flex-1 py-2.5 bg-error text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
              >
                {updatingTripId === cancelingTrip.id ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
