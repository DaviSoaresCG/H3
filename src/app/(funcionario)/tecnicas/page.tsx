'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, EventTechniqueServiceWithDetails } from '@/types';
import { TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '@/lib/constants';
import { calculateTechniquesTotal } from '@/lib/technique-validator';

export default function TecnicasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<EventTechniqueServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [eventName, setEventName] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [techniquesCount, setTechniquesCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated && dataMe.user) {
        setUser(dataMe.user);
      }

      const res = await fetch('/api/tecnicas');
      const data = await res.json();
      if (data.success) {
        setServices(data.services || []);
      }
    } catch (e) {
      console.error('Erro ao buscar técnicas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const calculatedTotalBonusCentavos = calculateTechniquesTotal(
    techniquesCount,
    TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS
  );

  const totalAcumuladoCentavos = services.reduce((sum, s) => sum + s.totalAmountCentavos, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !serviceDate) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/tecnicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          serviceDate,
          techniquesCount,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar técnica');
      }

      const valorFormatado = (calculatedTotalBonusCentavos / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      setFeedback({
        type: 'success',
        text: `Técnica em "${eventName}" registrada com sucesso! (+ ${valorFormatado})`,
      });
      setTimeout(() => setFeedback(null), 4000);
      setEventName('');
      setNotes('');
      setTechniquesCount(1);
      setShowAddModal(false);
      await fetchServices();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao registrar técnica' });
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Header com Ação */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-headline-md font-headline-md font-bold text-navy-deep">
            Técnicas de Eventos
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Lançamento e consulta de adicionais operacionais de eventos (R$ 150/técnica).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-navy-deep text-white hover:bg-slate-serious px-3.5 py-2 rounded-lg font-bold text-xs shadow-soft flex items-center gap-1.5 active:translate-y-px transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Lançar</span>
        </button>
      </div>

      {/* Card Resumo de Técnicas Acumuladas */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-soft border-l-4 border-l-secondary flex items-center justify-between">
        <div>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
            Total em Técnicas no Mês
          </span>
          <p className="text-2xl font-bold text-navy-deep mt-0.5">
            {(totalAcumuladoCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span className="material-symbols-outlined text-[26px]">assignment_turned_in</span>
        </div>
      </div>

      {/* Lista de Técnicas Registradas */}
      <section className="space-y-3">
        <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
          Meus Lançamentos de Técnicas
        </h2>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-body-sm animate-pulse">
            Carregando técnicas...
          </div>
        ) : services.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-8 text-center space-y-2 shadow-soft">
            <span className="material-symbols-outlined text-4xl text-slate-serious">construction</span>
            <p className="text-navy-deep font-bold text-body-md">Nenhuma técnica lançada no período.</p>
            <p className="text-on-surface-variant text-body-sm">
              Ao operar equipamentos ou apoiar montagem técnica em eventos, clique no botão "Lançar" acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft space-y-2 border-l-4 border-l-navy-deep"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-navy-deep text-body-md">{service.eventName}</h3>
                    <p className="text-xs text-on-surface-variant">
                      Data do serviço: {new Date(service.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-label-bold font-label-bold uppercase bg-secondary-container text-on-secondary-container">
                      +{service.techniquesCount} técnica(s)
                    </span>
                    <p className="font-bold text-navy-deep text-body-md mt-1">
                      {(service.totalAmountCentavos / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  </div>
                </div>

                {service.notes && (
                  <p className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg italic">
                    "{service.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Lançar Técnica */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Lançar Técnica de Evento</h3>
                <p className="text-body-sm text-on-surface-variant">R$ 150,00 por serviço técnico</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Nome do Evento / Cliente *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Ex: Casamento Buffet França, Feira Anhembi..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Data *</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">Qtd. Técnicas</label>
                  <select
                    value={techniquesCount}
                    onChange={(e) => setTechniquesCount(Number(e.target.value))}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  >
                    <option value={1}>1 Técnica (R$ 150)</option>
                    <option value={2}>2 Técnicas (R$ 300)</option>
                    <option value={3}>3 Técnicas (R$ 450)</option>
                    <option value={4}>4 Técnicas (R$ 600)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Observações (Opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Operação da mesa de som e apoio na montagem do gerador..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !eventName.trim()}
                  className="flex-1 py-3 bg-secondary text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
