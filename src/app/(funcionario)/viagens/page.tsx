'use client';

import { useState, useEffect, useCallback } from 'react';
import { TripWithDetails, User } from '@/types';
import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS } from '@/lib/constants';

export default function ViagensFuncionarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [myTrips, setMyTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTrips = useCallback(async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated && dataMe.user) {
        setUser(dataMe.user);

        const resTrips = await fetch(`/api/viagens?userId=${dataMe.user.id}`);
        const dataTrips = await resTrips.json();
        if (dataTrips.success) {
          setMyTrips(dataTrips.trips || []);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar viagens:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTrips();
  }, [fetchMyTrips]);

  const totalAllowanceAcumulada = myTrips.reduce((sum, trip) => {
    const myParticipant = trip.participants.find((p) => p.userId === user?.id);
    return (
      sum +
      (myParticipant?.totalAllowanceCentavos ||
        trip.totalDays * (trip.dailyAllowanceCentavos || DAILY_TRAVEL_ALLOWANCE_CENTAVOS))
    );
  }, 0);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-headline-md font-bold text-navy-deep">
          Minhas Viagens & Diárias
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Escalas de eventos externos, equipes e diárias acumuladas (R$ 150,00/dia).
        </p>
      </div>

      {/* Card Resumo de Diárias */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft border-l-4 border-l-secondary flex items-center justify-between">
        <div>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
            Total em Diárias de Viagem
          </span>
          <p className="text-2xl font-bold text-navy-deep mt-0.5">
            {(totalAllowanceAcumulada / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            payments
          </span>
        </div>
      </div>

      {/* Informativo Geofence */}
      <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl flex items-start gap-3 text-body-sm">
        <span className="material-symbols-outlined text-secondary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          flight_takeoff
        </span>
        <div className="space-y-0.5">
          <p className="font-bold text-navy-deep">Isenção de Geofence Ativa</p>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            Durante viagens oficiais ativas, você pode bater ponto em qualquer cidade sem gerar alerta de fora da sede.
          </p>
        </div>
      </div>

      {/* Lista de Viagens */}
      <section className="space-y-3">
        <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
          Minhas Escalas de Viagem
        </h2>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
            Carregando viagens...
          </div>
        ) : myTrips.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-8 text-center space-y-2 shadow-soft">
            <span className="material-symbols-outlined text-4xl text-slate-serious">luggage</span>
            <p className="text-navy-deep font-bold text-body-md">Nenhuma viagem agendada no momento.</p>
            <p className="text-on-surface-variant text-body-sm">
              Quando a gestão escalar você para uma viagem externa, ela aparecerá aqui com as diárias calculadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myTrips.map((trip) => {
              const myParticipant = trip.participants.find((p) => p.userId === user?.id);
              const allowanceAmountCentavos =
                myParticipant?.totalAllowanceCentavos ||
                trip.totalDays * (trip.dailyAllowanceCentavos || DAILY_TRAVEL_ALLOWANCE_CENTAVOS);

              const isActive = trip.status === 'ACTIVE';
              const isCompleted = trip.status === 'COMPLETED';

              return (
                <div
                  key={trip.id}
                  className={`bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft space-y-4 border-l-4 ${
                    isActive
                      ? 'border-l-secondary'
                      : isCompleted
                      ? 'border-l-slate-serious'
                      : 'border-l-navy-deep'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-label-bold font-label-bold uppercase ${
                            isActive
                              ? 'bg-secondary-container text-on-secondary-container'
                              : isCompleted
                              ? 'bg-surface-container text-outline'
                              : 'bg-primary-container text-white'
                          }`}
                        >
                          {isActive ? 'Em Andamento' : isCompleted ? 'Concluída' : 'Programada'}
                        </span>
                      </div>
                      <h3 className="font-bold text-navy-deep text-body-lg">{trip.title}</h3>
                      <p className="text-body-sm text-secondary font-semibold flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {trip.destinationCity}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase">Sua Diária</span>
                      <p className="font-bold text-navy-deep text-body-lg">
                        {(allowanceAmountCentavos / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="bg-surface-container-low p-3 rounded-lg">
                      <span className="text-on-surface-variant text-xs">Período ({trip.totalDays} dias)</span>
                      <p className="font-semibold text-navy-deep mt-0.5">
                        {new Date(trip.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a{' '}
                        {new Date(trip.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="bg-surface-container-low p-3 rounded-lg">
                      <span className="text-on-surface-variant text-xs">Equipe Escalada</span>
                      <p className="font-semibold text-navy-deep mt-0.5">
                        {trip.participants?.length || 1} colaborador(es)
                      </p>
                    </div>
                  </div>

                  {trip.vehicles && trip.vehicles.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">directions_car</span>
                      <span>
                        Veículo:{' '}
                        <strong>
                          {trip.vehicles.map((v) => `${v.vehicleName} (${v.plate})`).join(', ')}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
