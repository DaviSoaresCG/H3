'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventTechniqueServiceWithDetails, User } from '@/types';
import { formatDateBR } from '@/lib/date-utils';

export default function AdminTecnicasPage() {
  const [services, setServices] = useState<EventTechniqueServiceWithDetails[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para ajuste de quantidade pelo gestor
  const [editingService, setEditingService] = useState<EventTechniqueServiceWithDetails | null>(null);
  const [editCount, setEditCount] = useState<number>(1);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTecnicasData = useCallback(async () => {
    try {
      const resServices = await fetch('/api/tecnicas?all=true');
      const dataServices = await resServices.json();
      if (dataServices.success) {
        setServices(dataServices.services || []);
      }

      const resEmp = await fetch('/api/admin/employees');
      const dataEmp = await resEmp.json();
      if (dataEmp.success && dataEmp.employees) {
        setEmployees(dataEmp.employees);
      }
    } catch (e) {
      console.error('Erro ao buscar dados de técnicas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTecnicasData();
  }, [fetchTecnicasData]);

  const filteredServices =
    selectedEmployeeFilter === 'ALL'
      ? services
      : services.filter((s) => s.userId === selectedEmployeeFilter);

  const totalTechniquesCount = filteredServices.reduce((sum, s) => sum + s.techniquesCount, 0);
  const totalAmountCentavos = filteredServices.reduce((sum, s) => sum + s.totalAmountCentavos, 0);

  const handleOpenEdit = (service: EventTechniqueServiceWithDetails) => {
    setEditingService(service);
    setEditCount(service.techniquesCount);
    setEditNotes(service.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setSavingEdit(true);

    try {
      const res = await fetch('/api/tecnicas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: editingService.id,
          techniquesCount: editCount,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao ajustar técnica');
      }

      setFeedback({ type: 'success', text: 'Lançamento ajustado e recalculado com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setEditingService(null);
      await fetchTecnicasData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao ajustar técnica' });
    } finally {
      setSavingEdit(false);
    }
  };

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

      {/* Header */}
      <div>
        <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
          Serviços de Técnica em Eventos
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
          Auditoria e conferência de adicionais por operação de som, iluminação e geradores (R$ 150/técnica).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">assignment</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Lançamentos de Técnicas</p>
            <p className="text-2xl font-bold text-navy-deep">{totalTechniquesCount}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-secondary">
          <div className="w-12 h-12 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Total em Adicionais</p>
            <p className="text-2xl font-bold text-secondary">
              {(totalAmountCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3 border-l-4 border-l-navy-deep">
          <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-navy-deep">
            <span className="material-symbols-outlined text-[24px]">group</span>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-medium">Equipes Envolvidas</p>
            <p className="text-2xl font-bold text-navy-deep">{employees.length}</p>
          </div>
        </div>
      </div>

      {/* Filtro por Colaborador */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft flex items-center gap-3">
        <label className="text-body-sm font-bold text-navy-deep whitespace-nowrap">Filtrar por Colaborador:</label>
        <div className="relative flex-1 max-w-sm">
          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-lowest text-navy-deep font-semibold text-body-sm focus:border-navy-deep outline-none appearance-none cursor-pointer"
          >
            <option value="ALL">Todos os Colaboradores ({services.length} registros)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role})
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">
            arrow_drop_down
          </span>
        </div>
      </div>

      {/* Tabela de Técnicas */}
      <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-soft">
        <div className="p-4 border-b border-border-subtle bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-headline-md font-bold text-navy-deep">Lançamentos de Técnicas no Período</h3>
          <span className="font-label-caps text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-bold">
            {filteredServices.length} SERVIÇOS
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
            Carregando serviços de técnica...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm">
            Nenhum lançamento de técnica encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-5 py-3.5">Colaborador</th>
                  <th className="px-5 py-3.5">Evento / Cliente</th>
                  <th className="px-5 py-3.5">Data Serviço</th>
                  <th className="px-5 py-3.5">Qtd. Técnicas</th>
                  <th className="px-5 py-3.5">Valor Adicional</th>
                  <th className="px-5 py-3.5">Observações</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap font-bold">
                      {service.employeeName || 'Colaborador'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{service.eventName}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs">
                      {formatDateBR(service.serviceDate)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded text-label-bold uppercase bg-secondary-container text-on-secondary-container">
                        +{service.techniquesCount} técnica(s)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-bold text-secondary">
                      {(service.totalAmountCentavos / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-xs text-on-surface-variant italic">
                      {service.notes || '---'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(service)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-xs font-bold text-navy-deep transition shadow-sm active:translate-y-px"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar Lançamento */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Ajustar Lançamento de Técnica</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {editingService.employeeName} — {editingService.eventName}
                </p>
              </div>
              <button onClick={() => setEditingService(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Quantidade de Técnicas
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editCount}
                  onChange={(e) => setEditCount(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Observações / Justificativa
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div className="p-3 bg-secondary-container/40 rounded-lg text-xs font-bold text-on-secondary-container">
                Novo Valor Recalculado: R$ {(editCount * 150).toFixed(2)}
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
