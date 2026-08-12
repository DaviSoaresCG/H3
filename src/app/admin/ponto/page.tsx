'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminPontoPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);

  const fetchEspelho = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/espelho?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspelho();
  }, [selectedMonth]);

  // Exportar PDF do Espelho de Ponto
  const exportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('EventPoint — Espelho de Ponto Mensal', 14, 20);

    doc.setFontSize(10);
    doc.text(`Funcionário: ${reportData.employee?.name || 'Carlos Montador'}`, 14, 28);
    doc.text(`CPF: ${reportData.employee?.cpf || '111.111.111-11'}`, 14, 34);
    doc.text(`Mês de Referência: ${reportData.month}`, 14, 40);

    // Resumo Financeiro
    doc.text(`Total Adicional de Técnicas: R$ ${reportData.summary?.totalTechniquesAmountReais}`, 14, 48);
    doc.text(`Total Diárias de Viagem: R$ ${reportData.summary?.totalTravelAllowancesReais}`, 14, 54);
    doc.text(`Total Geral a Pagar: R$ ${reportData.summary?.grandTotalReais}`, 14, 60);

    // Tabela de Batidas
    const tableData = (reportData.entries || []).map((entry: any) => [
      new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      entry.entry_type,
      entry.transcription_text ? `🗣️ "${entry.transcription_text}"` : 'Sem relato',
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['Data', 'Hora', 'Tipo de Ponto', 'Relato / Obs']],
      body: tableData,
    });

    doc.save(`espelho_ponto_${reportData.month}.pdf`);
  };

  // Exportar Excel
  const exportExcel = () => {
    if (!reportData) return;
    const worksheet = XLSX.utils.json_to_sheet(
      (reportData.entries || []).map((e: any) => ({
        Data: new Date(e.timestamp).toLocaleDateString('pt-BR'),
        Hora: new Date(e.timestamp).toLocaleTimeString('pt-BR'),
        Tipo: e.entry_type,
        Relato: e.transcription_text || '',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ponto');
    XLSX.writeFile(workbook, `espelho_ponto_${reportData.month}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Navigation userRole="ADMIN" />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Espelho de Ponto & Fechamento</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Consolidação de horas, diárias de viagem (R$ 150/dia) e bônus por técnica de evento (R$ 150/un).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />

            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              📄 Emissão PDF
            </button>

            <button
              onClick={exportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              📊 Exportar Excel
            </button>
          </div>
        </div>

        {/* Resumo Financeiro do Fechamento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Batidas no Mês</span>
            <p className="text-2xl font-black text-white font-mono">{reportData?.summary?.entriesCount || 0}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Técnicas em Eventos (R$ 150/un)</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              R$ {reportData?.summary?.totalTechniquesAmountReais || '0.00'}
            </p>
            <span className="text-[11px] text-slate-400">{reportData?.summary?.techniquesCount || 0} técnicas realizadas</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Diárias de Viagem (R$ 150/dia)</span>
            <p className="text-2xl font-black text-indigo-400 font-mono">
              R$ {reportData?.summary?.totalTravelAllowancesReais || '0.00'}
            </p>
            <span className="text-[11px] text-slate-400">{reportData?.summary?.travelDaysCount || 0} dias em viagem</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Geral a Pagar</span>
            <p className="text-3xl font-black text-emerald-400 font-mono">
              R$ {reportData?.summary?.grandTotalReais || '0.00'}
            </p>
          </div>
        </div>

        {/* Tabela de Detalhamento do Espelho */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Detalhamento de Batidas — {reportData?.employee?.name || 'Carlos Montador'}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Hora</th>
                  <th className="py-3 px-3">Tipo de Ponto</th>
                  <th className="py-3 px-3">Relato do Dia (Áudio / Texto)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(reportData?.entries || []).map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-800/50">
                    <td className="py-3 px-3 text-white font-mono">
                      {new Date(e.timestamp).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-mono font-bold">
                      {new Date(e.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-semibold">{e.entry_type}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {e.transcription_text ? `🗣️ "${e.transcription_text}"` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
