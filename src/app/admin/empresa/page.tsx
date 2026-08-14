'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseCoordinatesInput, validateCoordinates } from '@/lib/geofence';

export default function AdminEmpresaPage() {
  const [hqName, setHqName] = useState('Sede Principal EventPoint');
  const [coordinatesInput, setCoordinatesInput] = useState('-23.550520, -46.633308');
  const [hqRadiusMeters, setHqRadiusMeters] = useState(500);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/empresa');
      const data = await res.json();
      if (data.success && data.settings) {
        setHqName(data.settings.hqName || 'Sede Principal');
        const lat = data.settings.hqLatitude ?? -23.55052;
        const lon = data.settings.hqLongitude ?? -46.633308;
        setCoordinatesInput(`${lat}, ${lon}`);
        setHqRadiusMeters(data.settings.hqRadiusMeters || 500);
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

  // Extrai latitude e longitude em tempo real do input
  const parsedCoords = parseCoordinatesInput(coordinatesInput) || {
    latitude: -23.55052,
    longitude: -46.633308,
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        text: 'Geolocalização não é suportada pelo seu navegador.',
      });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));

        setCoordinatesInput(`${lat}, ${lon}`);
        setLocating(false);

        if (accuracy > 500) {
          setFeedback({
            type: 'warning',
            text: `Localização obtida com margem de ±${(accuracy / 1000).toFixed(1)}km (estimativa de rede/IP). Para máxima precisão, copie e cole as coordenadas exatas do Google Maps.`,
          });
        } else {
          setFeedback({
            type: 'success',
            text: `GPS capturado com sucesso (precisão de ±${accuracy}m)!`,
          });
          setTimeout(() => setFeedback(null), 5000);
        }
      },
      (err) => {
        setLocating(false);
        setFeedback({
          type: 'error',
          text: `Falha ao obter GPS: ${err.message || 'Permissão negada'}.`,
        });
        setTimeout(() => setFeedback(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hqName.trim()) {
      setFeedback({ type: 'error', text: 'Nome da sede é obrigatório.' });
      return;
    }

    const parsed = parseCoordinatesInput(coordinatesInput);
    if (!parsed) {
      setFeedback({
        type: 'error',
        text: 'Formato de coordenadas não reconhecido. Exemplo aceito: -10.164483, -48.315105 ou link do Google Maps.',
      });
      return;
    }

    const validation = validateCoordinates(parsed.latitude, parsed.longitude);
    if (!validation.valid) {
      setFeedback({ type: 'error', text: validation.error || 'Coordenadas inválidas.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hqName: hqName.trim(),
          hqLatitude: parsed.latitude,
          hqLongitude: parsed.longitude,
          hqRadiusMeters,
          coordinates: coordinatesInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações');
      }

      setFeedback({ type: 'success', text: 'Configurações da Sede e Geofence salvas com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      await fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const latNum = parsedCoords.latitude;
  const lonNum = parsedCoords.longitude;
  const mapsUrl = `https://www.google.com/maps?q=${latNum},${lonNum}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lonNum - 0.008}%2C${latNum - 0.006}%2C${lonNum + 0.008}%2C${latNum + 0.006}&layer=mapnik&marker=${latNum}%2C${lonNum}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`w-full p-4 rounded-xl border text-body-sm font-medium flex items-start gap-3 animate-fadeIn shadow-soft ${
            feedback.type === 'success'
              ? 'bg-secondary-container/50 border-secondary text-on-secondary-container'
              : feedback.type === 'warning'
              ? 'bg-alert-warning/15 border-alert-warning text-navy-deep'
              : 'bg-error-container/60 border-error text-on-error-container'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[22px] shrink-0 ${
              feedback.type === 'success'
                ? 'text-secondary'
                : feedback.type === 'warning'
                ? 'text-alert-warning'
                : 'text-error'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {feedback.type === 'success' ? 'check_circle' : feedback.type === 'warning' ? 'warning' : 'error'}
          </span>
          <span className="flex-1 leading-relaxed">{feedback.text}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário Principal (7 cols) */}
          <div className="lg:col-span-7 bg-surface-card rounded-xl border border-border-subtle p-6 shadow-soft space-y-5">
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
                  value={hqName}
                  onChange={(e) => setHqName(e.target.value)}
                  placeholder="Ex: Sede Principal EventPoint - Galpão 01"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              {/* Campo Único: Cole as Coordenadas */}
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">location_on</span>
                  <span>Cole as Coordenadas ou Link do Google Maps *</span>
                </label>
                <input
                  type="text"
                  value={coordinatesInput}
                  onChange={(e) => setCoordinatesInput(e.target.value)}
                  placeholder="Ex: -10.164483, -48.315105 ou link do Google Maps"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-navy-deep focus:border-navy-deep outline-none"
                  required
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Aceita coordenadas diretas (ex: <code className="bg-surface-container px-1 rounded">-10.164483, -48.315105</code>) ou link copiado do Google Maps.
                </p>
              </div>

              {/* Slider de Raio */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-body-sm font-semibold text-navy-deep">
                    Raio de Tolerância / Geofence (Metros) *
                  </label>
                  <span className="text-xs font-bold text-secondary">{hqRadiusMeters} metros</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="50"
                  value={hqRadiusMeters}
                  onChange={(e) => setHqRadiusMeters(parseInt(e.target.value, 10) || 500)}
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

          {/* Card Informativo & Mapa Interativo (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface-card rounded-xl border border-border-subtle p-5 shadow-soft space-y-3">
              <h3 className="font-headline-md text-headline-md font-bold text-navy-deep flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pin_drop</span>
                <span>Visualização no Mapa</span>
              </h3>

              {/* Mapa Embutido Interativo */}
              <div className="w-full h-56 rounded-lg overflow-hidden border border-border-subtle shadow-inner relative bg-surface-container-low">
                <iframe
                  title="Mapa da Sede"
                  width="100%"
                  height="100%"
                  src={osmEmbedUrl}
                  className="border-0"
                  loading="lazy"
                />
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1 font-mono text-navy-deep">
                <p>LATITUDE: {latNum.toFixed(6)}</p>
                <p>LONGITUDE: {lonNum.toFixed(6)}</p>
                <p>RAIO: {hqRadiusMeters} metros</p>
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-navy-deep text-white hover:bg-slate-serious font-bold rounded-lg text-xs transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Abrir no Google Maps</span>
              </a>
            </div>

            <div className="bg-secondary-container/30 border border-secondary/30 rounded-xl p-4 text-xs text-on-secondary-container space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>Dica de Uso</span>
              </p>
              <p>
                Abra o Google Maps, clique com o botão direito sobre o local exato da sua sede ou galpão, clique no primeiro item para copiar as coordenadas e cole diretamente no campo acima.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
