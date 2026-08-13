'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminPontoPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [sundayRule, setSundayRule] = useState<'OVERTIME_100' | 'FIXED_DAILY'>('OVERTIME_100');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Ajuste Manual Auditado (INV-04)
  const [adjustingEntry, setAdjustingEntry] = useState<any | null>(null);
  const [newTimestamp, setNewTimestamp] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (data.success && data.employees?.length > 0) {
        setEmployees(data.employees);
        if (!selectedUserId) {
          setSelectedUserId(data.employees[0].id);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar funcionários:', e);
    }
  }, [selectedUserId]);

  const fetchEspelho = useCallback(async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/relatorios/espelho?userId=${selectedUserId}&month=${selectedMonth}&sundayRule=${sundayRule}`
      );
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error('Erro ao gerar espelho de ponto:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, selectedMonth, sundayRule]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (selectedUserId) {
      fetchEspelho();
    }
  }, [fetchEspelho, selectedUserId, selectedMonth, sundayRule]);

  const handleOpenAdjust = (entry: any) => {
    setAdjustingEntry(entry);
    const dt = new Date(entry.timestamp);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNewTimestamp(localIso);
    setAdjustmentReason(entry.adjustment_reason || '');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEntry || !adjustmentReason.trim() || !newTimestamp) return;
    setSavingAdjustment(true);

    try {
      const isoFormatted = new Date(newTimestamp).toISOString();
      const res = await fetch('/api/ponto/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeEntryId: adjustingEntry.id,
          newTimestamp: isoFormatted,
          adjustmentReason: adjustmentReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar ajuste');
      }

      setFeedback({ type: 'success', text: 'Ajuste de ponto auditado e salvo com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setAdjustingEntry(null);
      await fetchEspelho();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao ajustar ponto' });
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Exportar PDF
  const exportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42); // Navy Deep
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EventPoint — Espelho de Ponto & Fechamento Mensal', 14, 14);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empresa: EventPoint Locações de Eventos LTDA`, 14, 30);
    doc.text(`Funcionário: ${reportData.employee?.name || '---'}`, 14, 36);
    doc.text(`CPF: ${reportData.employee?.cpf || '---'}`, 14, 42);
    doc.text(`Mês de Referência: ${reportData.month}`, 120, 30);
    doc.text(`Regra de Domingos: ${sundayRule === 'OVERTIME_100' ? 'Horas Extras (100%)' : 'Diária Fixa'}`, 120, 36);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 120, 42);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 46, 196, 46);

    doc.setFont('helvetica', 'bold');
    doc.text(`Horas Trabalhadas: ${reportData.summary?.totalWorkedHours || 0}h`, 14, 52);
    doc.text(`Horas Extras: ${reportData.summary?.overtimeHours || 0}h`, 65, 52);
    doc.text(`Diárias de Viagem: R$ ${reportData.summary?.totalTravelAllowancesReais || '0.00'}`, 110, 52);
    doc.text(`Adic. Técnicas: R$ ${reportData.summary?.totalTechniquesAmountReais || '0.00'}`, 155, 52);

    const tableData = (reportData.entries || []).map((entry: any) => [
      new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      formatEntryType(entry.entry_type),
      entry.gps_status === 'OK' ? 'GPS Válido' : 'Sem GPS',
      entry.is_outside_hq ? 'Fora Sede' : 'Sede',
      entry.is_adjusted ? `Sim (${entry.adjustment_reason || 'Ajustado'})` : 'Não',
    ]);

    autoTable(doc, {
      startY: 58,
      head: [['Data', 'Horário', 'Tipo Batida', 'Status GPS', 'Localização', 'Ajustado?']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 200;
    if (finalY < 250) {
      doc.line(20, finalY + 25, 90, finalY + 25);
      doc.text('Assinatura do Colaborador', 30, finalY + 30);

      doc.line(120, finalY + 25, 190, finalY + 25);
      doc.text('Assinatura do Gestor', 135, finalY + 30);
    }

    doc.save(`espelho-ponto-${reportData.employee?.cpf || 'colaborador'}-${reportData.month}.pdf`);
  };

  // Exportar Excel (XLSX)
  const exportExcel = () => {
    if (!reportData) return;

    const dataToExport = (reportData.entries || []).map((entry: any) => ({
      Data: new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      Horário: new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'Tipo de Registro': formatEntryType(entry.entry_type),
      'GPS Status': entry.gps_status,
      'Fora da Sede?': entry.is_outside_hq ? 'SIM' : 'NÃO',
      'Ajuste Manual?': entry.is_adjusted ? 'SIM' : 'NÃO',
      'Motivo Ajuste': entry.adjustment_reason || '-',
      'Relato de Voz / Transcrição': entry.transcription_text || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Espelho de Ponto');
    XLSX.writeFile(wb, `espelho-${reportData.employee?.cpf || 'folha'}-${reportData.month}.xlsx`);
  };

  const formatEntryType = (type: string) => {
    switch (type) {
      case 'CLOCK_IN':
        return 'Entrada';
      case 'MEAL_START':
        return 'Início Almoço';
      case 'MEAL_END':
        return 'Fim Almoço';
      case 'CLOCK_OUT':
        return 'Saída';
      default:
        return type;
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
          Relatórios & Espelho de Ponto
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
          Conferência de jornada, auditoria de ajustes manuais e exportação de folha em PDF e Excel.
        </p>
      </div>

      {/* Bento Grid: Filtros (8 colunas) & Ações de Exportação (4 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Filtros */}
        <div className="lg:col-span-8 bg-surface-card rounded-xl border border-border-subtle p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
            <span className="material-symbols-outlined text-navy-deep text-[22px]">filter_list</span>
            <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
              Filtros de Extração
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Funcionário */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-label-bold font-label-bold text-on-surface-variant uppercase">
                Colaborador
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-12 px-4 border border-border-subtle rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-navy-deep font-semibold appearance-none cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — CPF: {emp.cpf} ({emp.role})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  arrow_drop_down
                </span>
              </div>
            </div>

            {/* Mês de Referência */}
            <div className="space-y-1.5">
              <label className="text-label-bold font-label-bold text-on-surface-variant uppercase">
                Mês de Referência
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-12 px-4 border border-border-subtle rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-navy-deep font-semibold"
              />
            </div>

            {/* Regra de Domingos */}
            <div className="space-y-1.5">
              <label className="text-label-bold font-label-bold text-on-surface-variant uppercase">
                Cálculo de Domingos/Feriados
              </label>
              <div className="relative">
                <select
                  value={sundayRule}
                  onChange={(e) => setSundayRule(e.target.value as any)}
                  className="w-full h-12 px-4 border border-border-subtle rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-navy-deep font-semibold appearance-none cursor-pointer"
                >
                  <option value="OVERTIME_100">Horas Extras 100% (CLT)</option>
                  <option value="FIXED_DAILY">Diária de Evento (R$ 150/dia)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  arrow_drop_down
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Exportação */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl border border-border-subtle p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
              Ações de Exportação
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {reportData?.entries?.length || 0} registros encontrados no período.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportPDF}
              disabled={!reportData || reportData.entries?.length === 0}
              className="w-full bg-navy-deep text-on-primary h-12 rounded-lg hover:bg-slate-serious transition-colors shadow-soft active:translate-y-px flex items-center justify-center gap-2.5 font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              <span>Exportar PDF (Espelho)</span>
            </button>

            <button
              onClick={exportExcel}
              disabled={!reportData || reportData.entries?.length === 0}
              className="w-full bg-surface-container-lowest text-navy-deep border border-border-subtle h-12 rounded-lg hover:bg-surface-container transition-colors shadow-sm active:translate-y-px flex items-center justify-center gap-2.5 font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px] text-success-vibrant">
                table_chart
              </span>
              <span>Exportar Planilha (XLSX)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo Mensal */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold">Horas Trabalhadas</span>
            <p className="text-2xl font-bold text-navy-deep mt-1">
              {reportData.summary.totalWorkedHours}h
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-alert-warning">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold">Horas Extras</span>
            <p className="text-2xl font-bold text-alert-warning mt-1">
              {reportData.summary.overtimeHours}h
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-secondary">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold">Diárias de Viagem</span>
            <p className="text-2xl font-bold text-secondary mt-1">
              R$ {reportData.summary.totalTravelAllowancesReais || '0.00'}
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-navy-deep">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold">Adicionais de Técnicas</span>
            <p className="text-2xl font-bold text-navy-deep mt-1">
              R$ {reportData.summary.totalTechniquesAmountReais || '0.00'}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Batidas do Espelho de Ponto */}
      <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-soft">
        <div className="p-4 border-b border-border-subtle bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-headline-md font-bold text-navy-deep">
            Batidas e Marcações do Mês
          </h3>
          <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-bold">
            {reportData?.entries?.length || 0} BATIDAS REGISTRADAS
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
            Carregando dados do espelho de ponto...
          </div>
        ) : !reportData || reportData.entries?.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm">
            Nenhuma batida de ponto encontrada para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-5 py-3.5">Data</th>
                  <th className="px-5 py-3.5">Horário</th>
                  <th className="px-5 py-3.5">Tipo</th>
                  <th className="px-5 py-3.5">GPS / Local</th>
                  <th className="px-5 py-3.5">Relato Transcrito</th>
                  <th className="px-5 py-3.5">Ajuste</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                {reportData.entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded text-label-bold font-label-bold uppercase bg-surface-container text-navy-deep">
                        {formatEntryType(entry.entry_type)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {entry.gps_status === 'OK' ? (
                        <span className="inline-flex items-center gap-1 text-success-vibrant text-xs font-bold">
                          <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
                          {entry.is_outside_hq ? 'Fora Sede' : 'Sede OK'}
                        </span>
                      ) : (
                        <span className="text-alert-warning text-xs font-bold">Sem GPS</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-xs text-on-surface-variant italic">
                      {entry.transcription_text || '---'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {entry.is_adjusted ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-alert-warning/20 text-alert-warning border border-alert-warning/30"
                          title={entry.adjustment_reason || 'Ajustado pelo gestor'}
                        >
                          Ajustado
                        </span>
                      ) : (
                        <span className="text-outline text-xs">Original</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenAdjust(entry)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-xs font-bold text-navy-deep transition shadow-sm active:translate-y-px"
                        title="Ajustar horário manualmente (INV-04)"
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

      {/* MODAL DE AJUSTE MANUAL DE PONTO AUDITADO (INV-04) */}
      {adjustingEntry && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
              <div>
                <h3 className="text-headline-md font-bold text-navy-deep">Ajuste Manual de Ponto</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {formatEntryType(adjustingEntry.entry_type)} em{' '}
                  {new Date(adjustingEntry.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => setAdjustingEntry(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Novo Horário / Data *
                </label>
                <input
                  type="datetime-local"
                  value={newTimestamp}
                  onChange={(e) => setNewTimestamp(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Motivo / Justificativa do Ajuste * (INV-04)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  rows={3}
                  placeholder="Ex: Esquecimento de batida na chegada ao evento..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                <p className="font-bold text-navy-deep">Aviso de Auditoria Trabalhista:</p>
                <p>
                  Esta alteração será registrada com seu usuário de gestor e marcada como batida ajustada no espelho de ponto oficial.
                </p>
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingEntry(null)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment || !adjustmentReason.trim()}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {savingAdjustment ? 'Salvando...' : 'Salvar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
