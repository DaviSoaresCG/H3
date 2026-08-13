'use client';

import { useState, useEffect, useCallback } from 'react';

interface CompanySettings {
  id?: string;
  hqName: string;
  hqLatitude: number;
  hqLongitude: number;
  hqRadiusMeters: number;
}

export default function AdminEmpresaPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    hqName: 'Sede Principal EventPoint',
    hqLatitude: -23.55052,
    hqLongitude: -46.633308,
    hqRadiusMeters: 500,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/empresa');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Erro ao buscar configurações da sede:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((prev) => ({
          ...prev,
          hqLatitude: Number(pos.coords.latitude.toFixed(8)),
          hqLongitude: Number(pos.coords.longitude.toFixed(8)),
        }));
        setLocating(false);
        setFeedback({
          type: 'success',
          text: `Coordenadas obtidas via GPS com precisão de ±${Math.round(pos.coords.accuracy)}m!`,
        });
        setTimeout(() => setFeedback(null), 4000);
      },
      (err) => {
        setLocating(false);
        setFeedback({
          type: 'error',
          text: `Falha ao obter GPS: ${err.message || 'Permissão negada'}.`,
        });
        setTimeout(() => setFeedback(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.hqName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações');
      }

      setFeedback({ type: 'success', text: 'Configurações da Sede e Geofence atualizadas com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      await fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const mapsUrl = `https://www.google.com/maps?q=${settings.hqLatitude},${settings.hqLongitude}`;

  return (
    <div className="space-y-6 max-w-4xl">
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
          Local da Empresa & Geofence
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
          Defina as coordenadas geográficas da sede da empresa para validação automática de ponto via GPS.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
          Carregando configurações da empresa...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Formulário Principal (7 cols) */}
          <div className="md:col-span-7 bg-surface-card rounded-xl border border-border-subtle p-6 shadow-soft space-y-5">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <span className="material-symbols-outlined text-navy-deep text-[22px]">apartment</span>
              <h2 className="font-headline-md text-headline-md font-bold text-navy-deep">
                Dados da Sede Operacional
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Nome da Sede / Galpão *
                </label>
                <input
                  type="text"
                  value={settings.hqName}
                  onChange={(e) => setSettings({ ...settings, hqName: e.target.value })}
                  placeholder="Ex: Sede Principal EventPoint - Galpão 01"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Latitude (GPS) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={settings.hqLatitude}
                    onChange={(e) => setSettings({ ...settings, hqLatitude: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Longitude (GPS) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={settings.hqLongitude}
                    onChange={(e) => setSettings({ ...settings, hqLongitude: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-body-sm font-semibold text-navy-deep">
                    Raio de Tolerância / Geofence (Metros) *
                  </label>
                  <span className="text-xs font-bold text-secondary">{settings.hqRadiusMeters} metros</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="50"
                  value={settings.hqRadiusMeters}
                  onChange={(e) => setSettings({ ...settings, hqRadiusMeters: parseInt(e.target.value, 10) || 500 })}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-navy-deep"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
                  <span>50m (Preciso)</span>
                  <span>500m (Padrão)</span>
                  <span>3.000m (Amplo)</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locating}
                  className="flex-1 py-2.5 px-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-bold rounded-lg transition border border-border-subtle flex items-center justify-center gap-2 text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {locating ? 'sync' : 'my_location'}
                  </span>
                  <span>{locating ? 'Capturando GPS...' : 'Usar Minha Localização Atual'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-navy-deep text-white font-bold rounded-lg shadow-soft hover:bg-slate-serious active:translate-y-px transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{saving ? 'Salvando...' : 'Salvar Sede'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card Informativo & Mapa (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-surface-card rounded-xl border border-border-subtle p-5 shadow-soft space-y-3">
              <h3 className="font-headline-md text-headline-md font-bold text-navy-deep flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pin_drop</span>
                <span>Visualização no Mapa</span>
              </h3>

              <p className="text-body-sm text-on-surface-variant">
                Qualquer batida de ponto registrada fora do raio de <strong>{settings.hqRadiusMeters}m</strong> dessas coordenadas sem uma viagem vinculada gerará um alerta de <strong>"Fora da Sede"</strong> no dashboard administrativo.
              </p>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1 font-mono text-navy-deep">
                <p>LAT: {settings.hqLatitude}</p>
                <p>LON: {settings.hqLongitude}</p>
                <p>RAIO: {settings.hqRadiusMeters} metros</p>
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-surface-container text-navy-deep hover:bg-surface-container-high font-bold rounded-lg text-xs transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Abrir no Google Maps</span>
              </a>
            </div>

            <div className="bg-secondary-container/30 border border-secondary/30 rounded-xl p-4 text-xs text-on-secondary-container space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>Como funciona o Geofencing?</span>
              </p>
              <p>
                O sistema usa a fórmula de <em>Haversine</em> de alta precisão. Quando o colaborador clica em "Bater Ponto", o GPS calcula a distância euclidiana da Terra até a sede.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
