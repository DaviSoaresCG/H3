'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

export default function TecnicasPage() {
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [eventName, setEventName] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [techniquesCount, setTechniquesCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchServices = async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated) setUser(dataMe.user);

      const res = await fetch('/api/tecnicas');
      const data = await res.json();
      if (data.success) {
        setServices(data.services || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !serviceDate) return;
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
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar técnica');

      setFeedback(`Técnica salva com sucesso! (+ R$ ${(techniquesCount * 150).toFixed(2)})`);
      setTimeout(() => setFeedback(''), 4000);
      setEventName('');
      setNotes('');
      setTechniquesCount(1);
      await fetchServices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-6">
      <Navigation userRole={user?.role} />

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white tracking-tight">Técnicas de Eventos</h2>
          <p className="text-xs text-slate-400">
            Registre serviços operacionais em eventos. Cada técnica equivale a R$ 150,00 adicionais.
          </p>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium text-center">
            ✅ {feedback}
          </div>
        )}

        {/* Formulário de Registro de Técnica */}
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lançar Nova Técnica</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Evento / Cliente</label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ex: Buffet França - Casamento Silva"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data do Serviço</label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Qtd de Técnicas (R$ 150/un)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={techniquesCount}
                  onChange={(e) => setTechniquesCount(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white text-center font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Adicional a Receber:</span>
              <span className="text-emerald-400 font-extrabold text-sm">
                R$ {(techniquesCount * 150).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Observações (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Operação de Mesa de Som e Microfones Sem Fio..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition"
          >
            {submitting ? 'Registrando...' : 'Registrar Técnica (R$ 150/un)'}
          </button>
        </form>

        {/* Lista de Técnicas Registradas */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histórico de Técnicas</h3>

          {services.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">Nenhuma técnica registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {services.map((item) => (
                <div key={item.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{item.event_name}</p>
                    <p className="text-slate-400 text-[11px]">
                      {new Date(item.service_date).toLocaleDateString('pt-BR')} • {item.techniques_count} técnica(s)
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    + R$ {(Number(item.total_amount_centavos) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
