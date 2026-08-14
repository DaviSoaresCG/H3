'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { User } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateBR } from '@/lib/date-utils';

type ActiveTab = 'entries' | 'trips' | 'techniques' | 'summary';

function AdminPontoContent() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get('userId');

  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(urlUserId || 'ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [sundayRule, setSundayRule] = useState<'OVERTIME_100' | 'FIXED_DAILY'>('OVERTIME_100');
  const [activeTab, setActiveTab] = useState<ActiveTab>('entries');
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
      }
    } catch (e) {
      console.error('Erro ao buscar funcionários:', e);
    }
  }, []);

  const fetchEspelho = useCallback(async () => {
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
    if (urlUserId && urlUserId !== selectedUserId) {
      setSelectedUserId(urlUserId);
    }
  }, [urlUserId, selectedUserId]);

  useEffect(() => {
    fetchEspelho();
  }, [fetchEspelho]);

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
    doc.text(`Mês de Referência: ${reportData.month}`, 120, 30);
    doc.text(`Regra de Domingos: ${sundayRule === 'OVERTIME_100' ? 'Horas Extras (100%)' : 'Diária Fixa'}`, 120, 36);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 120, 42);

    if (reportData.isTeamSummary) {
      doc.text(`Relatório: Fechamento Consolidado de Toda a Equipe`, 14, 36);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 46, 196, 46);

      const tableData = (reportData.teamSummaries || []).map((item: any) => [
        item.employee?.name,
        `${item.totalWorkedHours}h`,
        `${item.overtimeHours}h`,
        `R$ ${item.totalTravelAllowancesReais} (${item.travelDaysCount}d)`,
        `R$ ${item.totalTechniquesAmountReais} (${item.techniquesCount}un)`,
        `R$ ${item.grandTotalBonusReais}`,
      ]);

      autoTable(doc, {
        startY: 52,
        head: [['Colaborador', 'Horas Totais', 'Horas Extras', 'Diárias Viagem', 'Adic. Técnicas', 'Total a Pagar']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
      });

      doc.save(`fechamento-equipe-${reportData.month}.pdf`);
      return;
    }

    doc.text(`Funcionário: ${reportData.employee?.name || '---'}`, 14, 36);
    doc.text(`CPF: ${reportData.employee?.cpf || '---'}`, 14, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 46, 196, 46);

    doc.setFont('helvetica', 'bold');
    doc.text(`Horas Trabalhadas: ${reportData.summary?.totalWorkedHours || 0}h`, 14, 52);
    doc.text(`Horas Extras: ${reportData.summary?.overtimeHours || 0}h`, 65, 52);
    doc.text(`Diárias Viagem: R$ ${reportData.summary?.totalTravelAllowancesReais || '0.00'}`, 110, 52);
    doc.text(`Adic. Técnicas: R$ ${reportData.summary?.totalTechniquesAmountReais || '0.00'}`, 155, 52);

    // 1. Tabela de Batidas de Ponto
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
      body: tableData.length > 0 ? tableData : [['Nenhum registro no período', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    let lastY = (doc as any).lastAutoTable.finalY || 100;

    // 2. Tabela de Diárias de Viagem (se houver)
    if (reportData.tripParticipations && reportData.tripParticipations.length > 0) {
      if (lastY > 230) {
        doc.addPage();
        lastY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Diárias de Viagem Realizadas no Período (R$ 150/dia):', 14, lastY + 8);

      const tripsData = reportData.tripParticipations.map((tp: any) => [
        tp.title,
        tp.destinationCity,
        `${formatDateBR(tp.startDate)} a ${formatDateBR(tp.endDate)}`,
        `${tp.daysCount} dia(s)`,
        `R$ ${(Number(tp.totalAllowanceCentavos || 0) / 100).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: lastY + 12,
        head: [['Evento / Viagem', 'Destino', 'Período', 'Duração', 'Valor Diárias']],
        body: tripsData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      lastY = (doc as any).lastAutoTable.finalY || lastY + 40;
    }

    // 3. Tabela de Adicionais de Técnicas (se houver)
    if (reportData.techniqueServices && reportData.techniqueServices.length > 0) {
      if (lastY > 230) {
        doc.addPage();
        lastY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Adicionais de Técnicas de Eventos no Período (R$ 150/técnica):', 14, lastY + 8);

      const tecsData = reportData.techniqueServices.map((tec: any) => [
        formatDateBR(tec.serviceDate),
        tec.eventName,
        `${tec.techniquesCount} técnica(s)`,
        `R$ ${(Number(tec.totalAmountCentavos || 0) / 100).toFixed(2)}`,
        tec.notes || '-',
      ]);

      autoTable(doc, {
        startY: lastY + 12,
        head: [['Data', 'Evento', 'Qtd Técnicas', 'Valor Total', 'Observações']],
        body: tecsData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      lastY = (doc as any).lastAutoTable.finalY || lastY + 40;
    }

    if (lastY > 240) {
      doc.addPage();
      lastY = 20;
    }

    doc.line(20, lastY + 25, 90, lastY + 25);
    doc.setFontSize(8);
    doc.text('Assinatura do Colaborador', 30, lastY + 30);

    doc.line(120, lastY + 25, 190, lastY + 25);
    doc.text('Assinatura do Gestor', 135, lastY + 30);

    doc.save(`espelho-ponto-${reportData.employee?.cpf || 'colaborador'}-${reportData.month}.pdf`);
  };

  // Exportar Excel (XLSX)
  const exportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    if (reportData.isTeamSummary) {
      const summaryData = (reportData.teamSummaries || []).map((item: any) => ({
        Colaborador: item.employee?.name || '-',
        CPF: item.employee?.cpf || '-',
        'Horas Totais': `${item.totalWorkedHours}h`,
        'Horas Normais': `${item.regularHours}h`,
        'Horas Extras (>8h)': `${item.overtimeHours}h`,
        'Dias de Viagem': item.travelDaysCount,
        'Diárias de Viagem (R$)': item.totalTravelAllowancesReais,
        'Qtd Técnicas': item.techniquesCount,
        'Adicionais Técnicas (R$)': item.totalTechniquesAmountReais,
        'Total a Pagar (R$)': item.grandTotalBonusReais,
      }));
      const ws = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws, 'Fechamento Equipe');
      XLSX.writeFile(wb, `fechamento-equipe-${reportData.month}.xlsx`);
      return;
    }

    // 1. Aba Batidas de Ponto
    const pontoData = (reportData.entries || []).map((entry: any) => ({
      Data: new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      Horário: new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'Tipo de Registro': formatEntryType(entry.entry_type),
      'GPS Status': entry.gps_status,
      'Fora da Sede?': entry.is_outside_hq ? 'SIM' : 'NÃO',
      'Ajuste Manual?': entry.is_adjusted ? 'SIM' : 'NÃO',
      'Motivo Ajuste': entry.adjustment_reason || '-',
      'Relato de Voz / Transcrição': entry.transcription_text || '-',
    }));
    const wsPonto = XLSX.utils.json_to_sheet(pontoData);
    XLSX.utils.book_append_sheet(wb, wsPonto, 'Batidas de Ponto');

    // 2. Aba Diárias de Viagem
    if (reportData.tripParticipations && reportData.tripParticipations.length > 0) {
      const tripsData = reportData.tripParticipations.map((tp: any) => ({
        'Evento / Viagem': tp.title,
        'Cidade Destino': tp.destinationCity,
        'Data Início': formatDateBR(tp.startDate),
        'Data Fim': formatDateBR(tp.endDate),
        'Dias de Viagem': tp.daysCount,
        'Valor Total (R$)': (Number(tp.totalAllowanceCentavos || 0) / 100).toFixed(2),
      }));
      const wsTrips = XLSX.utils.json_to_sheet(tripsData);
      XLSX.utils.book_append_sheet(wb, wsTrips, 'Diárias de Viagem');
    }

    // 3. Aba Técnicas de Eventos
    if (reportData.techniqueServices && reportData.techniqueServices.length > 0) {
      const tecsData = reportData.techniqueServices.map((tec: any) => ({
        Data: formatDateBR(tec.serviceDate),
        'Nome do Evento': tec.eventName,
        'Quantidade de Técnicas': tec.techniquesCount,
        'Valor Total (R$)': (Number(tec.totalAmountCentavos || 0) / 100).toFixed(2),
        Observações: tec.notes || '-',
      }));
      const wsTecs = XLSX.utils.json_to_sheet(tecsData);
      XLSX.utils.book_append_sheet(wb, wsTecs, 'Técnicas de Eventos');
    }

    // 4. Aba Resumo Consolidado
    const summaryData = [
      { Indicador: 'Colaborador', Valor: reportData.employee?.name || '-' },
      { Indicador: 'CPF', Valor: reportData.employee?.cpf || '-' },
      { Indicador: 'Mês de Referência', Valor: reportData.month },
      { Indicador: 'Total de Horas Trabalhadas', Valor: `${reportData.summary?.totalWorkedHours || 0}h` },
      { Indicador: 'Horas Normais', Valor: `${reportData.summary?.regularHours || 0}h` },
      { Indicador: 'Horas Extras (excedente 8h/dia)', Valor: `${reportData.summary?.overtimeHours || 0}h` },
      { Indicador: 'Horas de Domingo / Feriado', Valor: `${reportData.summary?.sundayHolidayHours || 0}h` },
      { Indicador: 'Qtd Dias de Viagem', Valor: reportData.summary?.travelDaysCount || 0 },
      { Indicador: 'Total Diárias de Viagem (R$)', Valor: reportData.summary?.totalTravelAllowancesReais || '0.00' },
      { Indicador: 'Qtd Serviços de Técnicas', Valor: reportData.summary?.techniquesCount || 0 },
      { Indicador: 'Total Adicionais de Técnicas (R$)', Valor: reportData.summary?.totalTechniquesAmountReais || '0.00' },
      { Indicador: 'Total Bruto de Adicionais / Bônus (R$)', Valor: reportData.summary?.grandTotalBonusReais || '0.00' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Mensal');

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

  const isTeam = reportData?.isTeamSummary;

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
          Conferência de jornada diária, horas extras (&gt;8h/dia), diárias de viagem (R$ 150/dia), adicionais de técnicas (R$ 150/técnica) e exportação da folha.
        </p>
      </div>

      {/* Bento Grid: Filtros & Ações de Exportação */}
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
                  <option value="ALL">👥 Todos os Colaboradores (Fechamento Consolidado da Empresa)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — CPF: {emp.cpf} ({emp.role === 'ADMIN' ? 'Admin' : 'Operacional'})
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
              {isTeam
                ? `Consolidado de ${reportData?.teamSummaries?.length || 0} colaboradores cadastrados.`
                : `${reportData?.entries?.length || 0} batidas, ${reportData?.tripParticipations?.length || 0} viagens e ${reportData?.techniqueServices?.length || 0} técnicas.`}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportPDF}
              disabled={!reportData}
              className="w-full bg-navy-deep text-on-primary h-12 rounded-lg hover:bg-slate-serious transition-colors shadow-soft active:translate-y-px flex items-center justify-center gap-2.5 font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              <span>{isTeam ? 'Exportar PDF da Equipe' : 'Exportar PDF Completo'}</span>
            </button>

            <button
              onClick={exportExcel}
              disabled={!reportData}
              className="w-full bg-surface-container-lowest text-navy-deep border border-border-subtle h-12 rounded-lg hover:bg-surface-container transition-colors shadow-sm active:translate-y-px flex items-center justify-center gap-2.5 font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px] text-success-vibrant">
                table_chart
              </span>
              <span>{isTeam ? 'Exportar Planilha Consolidada' : 'Exportar Planilha (XLSX)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold text-xs">
              {isTeam ? 'Total Horas Trabalhadas (Equipe)' : 'Total Horas Trabalhadas'}
            </span>
            <p className="text-2xl font-bold text-navy-deep mt-1">
              {isTeam ? `${reportData.teamTotals.totalWorkedHours}h` : `${reportData.summary.totalWorkedHours}h`}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {isTeam
                ? `${reportData.teamTotals.regularHours}h normais + ${reportData.teamTotals.overtimeHours}h extras`
                : `${reportData.summary.regularHours}h normais + ${reportData.summary.overtimeHours}h extras`}
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-alert-warning">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold text-xs">
              Horas Extras (&gt;8h/dia)
            </span>
            <p className="text-2xl font-bold text-alert-warning mt-1">
              {isTeam ? `${reportData.teamTotals.overtimeHours}h` : `${reportData.summary.overtimeHours}h`}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Jornada padrão de 8h/dia
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-secondary">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold text-xs">
              Diárias de Viagem
            </span>
            <p className="text-2xl font-bold text-secondary mt-1">
              R$ {isTeam ? reportData.teamTotals.totalTravelAllowancesReais : reportData.summary.totalTravelAllowancesReais}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {isTeam ? `${reportData.teamTotals.travelDaysCount} dias de viagem` : `${reportData.summary.travelDaysCount} dias de viagem`}
            </p>
          </div>

          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-soft border-l-4 border-l-navy-deep">
            <span className="font-label-caps text-on-surface-variant uppercase font-bold text-xs">
              Adicionais de Técnicas
            </span>
            <p className="text-2xl font-bold text-navy-deep mt-1">
              R$ {isTeam ? reportData.teamTotals.totalTechniquesAmountReais : reportData.summary.totalTechniquesAmountReais}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {isTeam ? `${reportData.teamTotals.techniquesCount} técnicas montadas` : `${reportData.summary.techniquesCount} técnicas montadas`}
            </p>
          </div>
        </div>
      )}

      {/* Visão de Todos os Colaboradores (isTeamSummary) */}
      {isTeam ? (
        <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-soft">
          <div className="p-4 border-b border-border-subtle bg-surface-container-lowest flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-navy-deep">groups</span>
              <h3 className="font-headline-md font-bold text-navy-deep">
                Fechamento Consolidado da Equipe — {reportData.month}
              </h3>
            </div>
            <span className="font-label-caps text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-bold text-xs">
              {reportData.teamSummaries?.length || 0} COLABORADORES
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
              Carregando dados da equipe...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider text-xs">
                    <th className="px-5 py-3.5">Colaborador</th>
                    <th className="px-5 py-3.5">Horas Trabalhadas</th>
                    <th className="px-5 py-3.5">Horas Extras (&gt;8h)</th>
                    <th className="px-5 py-3.5">Diárias Viagem</th>
                    <th className="px-5 py-3.5">Adic. Técnicas</th>
                    <th className="px-5 py-3.5">Total a Pagar</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                  {reportData.teamSummaries.map((item: any) => (
                    <tr key={item.employee.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold">{item.employee.name}</div>
                        <div className="text-xs font-mono text-on-surface-variant">CPF: {item.employee.cpf}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold">
                        {item.totalWorkedHours}h
                        <span className="block text-xs font-normal text-on-surface-variant">({item.regularHours}h normais)</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-alert-warning">
                        {item.overtimeHours}h
                      </td>
                      <td className="px-5 py-3.5 font-bold text-secondary">
                        R$ {item.totalTravelAllowancesReais}
                        <span className="block text-xs font-normal text-on-surface-variant">{item.travelDaysCount} dia(s)</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-navy-deep">
                        R$ {item.totalTechniquesAmountReais}
                        <span className="block text-xs font-normal text-on-surface-variant">{item.techniquesCount} técnica(s)</span>
                      </td>
                      <td className="px-5 py-3.5 font-black text-secondary text-body-md">
                        R$ {item.grandTotalBonusReais}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedUserId(item.employee.id)}
                          className="px-3 py-1.5 bg-navy-deep hover:bg-slate-serious text-white text-xs font-bold rounded-lg transition shadow-sm"
                        >
                          Ver Espelho
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Navegação por Abas para Detalhamento Individual */
        <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-soft">
          <div className="flex border-b border-border-subtle bg-surface-container-lowest overflow-x-auto">
            <button
              onClick={() => setActiveTab('entries')}
              className={`px-5 py-3.5 text-body-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'entries'
                  ? 'border-navy-deep text-navy-deep bg-surface-card'
                  : 'border-transparent text-on-surface-variant hover:text-navy-deep'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>Batidas de Ponto ({reportData?.entries?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('trips')}
              className={`px-5 py-3.5 text-body-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'trips'
                  ? 'border-secondary text-secondary bg-surface-card'
                  : 'border-transparent text-on-surface-variant hover:text-navy-deep'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
              <span>Diárias de Viagem ({reportData?.tripParticipations?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('techniques')}
              className={`px-5 py-3.5 text-body-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'techniques'
                  ? 'border-navy-deep text-navy-deep bg-surface-card'
                  : 'border-transparent text-on-surface-variant hover:text-navy-deep'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">speaker</span>
              <span>Adicionais de Técnicas ({reportData?.techniqueServices?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`px-5 py-3.5 text-body-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'summary'
                  ? 'border-navy-deep text-navy-deep bg-surface-card'
                  : 'border-transparent text-on-surface-variant hover:text-navy-deep'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Fechamento Consolidado</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
              Carregando dados do espelho de ponto...
            </div>
          ) : (
            <div className="p-0">
              {/* ABA 1: BATIDAS DE PONTO */}
              {activeTab === 'entries' && (
                <div>
                  {!reportData || reportData.entries?.length === 0 ? (
                    <div className="text-center py-16 text-on-surface-variant text-body-sm">
                      Nenhuma batida de ponto registrada no período selecionado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider text-xs">
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
                                <span className="px-2.5 py-1 rounded text-label-bold font-label-bold uppercase bg-surface-container text-navy-deep text-xs">
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
                                  className="text-xs font-bold text-navy-deep hover:text-slate-serious bg-surface-container px-2.5 py-1.5 rounded-lg transition"
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
              )}

              {/* ABA 2: DIÁRIAS DE VIAGEM */}
              {activeTab === 'trips' && (
                <div>
                  {!reportData?.tripParticipations || reportData.tripParticipations.length === 0 ? (
                    <div className="text-center py-16 text-on-surface-variant text-body-sm">
                      Nenhuma viagem vinculada a este colaborador no mês de {reportData?.month}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider text-xs">
                            <th className="px-5 py-3.5">Evento / Viagem</th>
                            <th className="px-5 py-3.5">Cidade de Destino</th>
                            <th className="px-5 py-3.5">Período</th>
                            <th className="px-5 py-3.5">Dias Computados</th>
                            <th className="px-5 py-3.5 text-right">Diária Total (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                          {reportData.tripParticipations.map((tp: any, idx: number) => (
                            <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                              <td className="px-5 py-3.5 font-bold">{tp.title}</td>
                              <td className="px-5 py-3.5 text-secondary font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">location_on</span>
                                {tp.destinationCity}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-on-surface-variant">
                                {formatDateBR(tp.startDate)} a {formatDateBR(tp.endDate)}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="px-2.5 py-1 bg-surface-container rounded-full text-xs font-bold">
                                  {tp.daysCount} dia(s)
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-secondary text-body-md">
                                {(Number(tp.totalAllowanceCentavos || 0) / 100).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: ADICIONAIS DE TÉCNICAS */}
              {activeTab === 'techniques' && (
                <div>
                  {!reportData?.techniqueServices || reportData.techniqueServices.length === 0 ? (
                    <div className="text-center py-16 text-on-surface-variant text-body-sm">
                      Nenhum serviço de técnica registrado por este colaborador no mês de {reportData?.month}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider text-xs">
                            <th className="px-5 py-3.5">Data do Serviço</th>
                            <th className="px-5 py-3.5">Nome do Evento</th>
                            <th className="px-5 py-3.5">Qtd Técnicas</th>
                            <th className="px-5 py-3.5">Observações</th>
                            <th className="px-5 py-3.5 text-right">Valor Total (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                          {reportData.techniqueServices.map((tec: any) => (
                            <tr key={tec.id} className="hover:bg-surface-container-low/50 transition-colors">
                              <td className="px-5 py-3.5 font-semibold">{formatDateBR(tec.serviceDate)}</td>
                              <td className="px-5 py-3.5 font-bold text-navy-deep">{tec.eventName}</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2.5 py-1 bg-surface-container rounded-full text-xs font-bold">
                                  {tec.techniquesCount} técnica(s)
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-on-surface-variant italic">
                                {tec.notes || '---'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-navy-deep text-body-md">
                                {(Number(tec.totalAmountCentavos || 0) / 100).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: FECHAMENTO CONSOLIDADO */}
              {activeTab === 'summary' && reportData?.summary && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resumo de Jornada */}
                    <div className="bg-surface-container-low p-5 rounded-xl border border-border-subtle space-y-3">
                      <h4 className="font-bold text-navy-deep text-body-md flex items-center gap-2 border-b border-border-subtle pb-2">
                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                        <span>Totalizadores de Jornada (CLT)</span>
                      </h4>
                      <div className="space-y-2 text-body-sm">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Horas Normais Trabalhadas:</span>
                          <span className="font-bold text-navy-deep">{reportData.summary.regularHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Horas Extras (&gt;8h/dia):</span>
                          <span className="font-bold text-alert-warning">{reportData.summary.overtimeHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Horas em Domingos / Feriados:</span>
                          <span className="font-bold text-navy-deep">{reportData.summary.sundayHolidayHours}h ({reportData.summary.sundayDaysCount} dias)</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border-subtle">
                          <span className="font-bold text-navy-deep">Total Horas Registradas:</span>
                          <span className="font-bold text-navy-deep text-body-md">{reportData.summary.totalWorkedHours}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumo de Adicionais Financeiros */}
                    <div className="bg-surface-container-low p-5 rounded-xl border border-border-subtle space-y-3">
                      <h4 className="font-bold text-navy-deep text-body-md flex items-center gap-2 border-b border-border-subtle pb-2">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                        <span>Adicionais e Diárias a Pagar</span>
                      </h4>
                      <div className="space-y-2 text-body-sm">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Diárias de Viagem ({reportData.summary.travelDaysCount} dias):</span>
                          <span className="font-bold text-secondary">R$ {reportData.summary.totalTravelAllowancesReais}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Adicionais de Técnicas ({reportData.summary.techniquesCount} un):</span>
                          <span className="font-bold text-navy-deep">R$ {reportData.summary.totalTechniquesAmountReais}</span>
                        </div>
                        {Number(reportData.summary.sundayBonusReais) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Bônus de Domingo ({sundayRule === 'FIXED_DAILY' ? 'Diária Fixa' : 'H.E. 100%'}):</span>
                            <span className="font-bold text-navy-deep">R$ {reportData.summary.sundayBonusReais}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border-subtle">
                          <span className="font-bold text-navy-deep">Total Bruto de Bônus / Diárias:</span>
                          <span className="font-bold text-secondary text-headline-sm">R$ {reportData.summary.grandTotalBonusReais}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Ajuste Manual Auditado */}
      {adjustingEntry && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-lg rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Ajuste Manual Auditado</h3>
              <button onClick={() => setAdjustingEntry(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1 text-on-surface-variant">
                <p>
                  <strong>Tipo de Batida:</strong> {formatEntryType(adjustingEntry.entry_type)}
                </p>
                <p>
                  <strong>Horário Original:</strong> {new Date(adjustingEntry.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Novo Horário *</label>
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
                  Justificativa Obrigatória (Auditoria INV-04) *
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ex: Esqueceu de registrar saída ao término do evento no Buffet França..."
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none h-24 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
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
                  {savingAdjustment ? 'Salvando...' : 'Salvar Ajuste Auditado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPontoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-on-surface-variant">Carregando painel de relatórios...</div>}>
      <AdminPontoContent />
    </Suspense>
  );
}
