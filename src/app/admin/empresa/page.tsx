'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseCoordinatesInput, validateCoordinates } from '@/lib/geofence';
import { GeocodeResult } from '@/lib/geocoding';

export default function AdminEmpresaPage() {
  const [hqName, setHqName] = useState('Sede Principal EventPoint');
  const [latStr, setLatStr] = useState('-23.550520');
  const [lonStr, setLonStr] = useState('-46.633308');
  const [hqRadiusMeters, setHqRadiusMeters] = useState(500);
  const [smartPasteInput, setSmartPasteInput] = useState('');

  // Busca por endereço / CEP
  const [addressQuery, setAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);

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
        setLatStr(String(data.settings.hqLatitude ?? -23.55052));
        setLonStr(String(data.settings.hqLongitude ?? -46.633308));
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

  // Parse inteligente quando o usuário colar coordenadas ou link do Maps
  const handleSmartPaste = (raw: string) => {
    setSmartPasteInput(raw);
    if (!raw.trim()) return;

    const parsed = parseCoordinatesInput(raw);
    if (parsed) {
      setLatStr(parsed.latitude.toFixed(6));
      setLonStr(parsed.longitude.toFixed(6));
      setFeedback({
        type: 'success',
        text: `Coordenadas identificadas com sucesso: Lat ${parsed.latitude.toFixed(6)}, Lon ${parsed.longitude.toFixed(6)}`,
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Busca de coordenadas por endereço / CEP
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim() || addressQuery.trim().length < 3) return;

    setSearchingAddress(true);
    setAddressResults([]);
    try {
      const res = await fetch(`/api/admin/empresa/geocode?q=${encodeURIComponent(addressQuery.trim())}`);
      const data = await res.json();
      if (data.success && data.results?.length > 0) {
        setAddressResults(data.results);
      } else {
        setFeedback({
          type: 'warning',
          text: 'Nenhum endereço encontrado para este termo. Tente incluir rua, número, cidade ou CEP.',
        });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Falha ao buscar endereço. Verifique sua conexão.' });
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSelectAddress = (item: GeocodeResult) => {
    setLatStr(item.latitude.toFixed(6));
    setLonStr(item.longitude.toFixed(6));
    setAddressResults([]);
    setAddressQuery('');
    setFeedback({
      type: 'success',
      text: `Endereço selecionado! Coordenadas ajustadas para Lat ${item.latitude.toFixed(6)}, Lon ${item.longitude.toFixed(6)}`,
    });
    setTimeout(() => setFeedback(null), 4000);
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

        setLatStr(String(lat));
        setLonStr(String(lon));
        setLocating(false);

        // Se a acurácia for maior que 500m (comum em navegadores desktop triangulados por IP)
        if (accuracy > 500) {
          setFeedback({
            type: 'warning',
            text: `Localização obtida com margem de ±${(accuracy / 1000).toFixed(1)}km (estimativa de rede/IP). Para máxima precisão, use a busca por endereço ou cole o link do Google Maps da sua sede.`,
          });
        } else {
          setFeedback({
            type: 'success',
            text: `GPS de alta precisão capturado com sucesso (precisão de ±${accuracy}m)!`,
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

    const cleanLat = parseFloat(latStr.trim().replace(',', '.'));
    const cleanLon = parseFloat(lonStr.trim().replace(',', '.'));

    const validation = validateCoordinates(cleanLat, cleanLon);
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
          hqLatitude: cleanLat,
          hqLongitude: cleanLon,
          hqRadiusMeters,
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

  const currentLatNum = parseFloat(latStr.trim().replace(',', '.')) || -23.55052;
  const currentLonNum = parseFloat(lonStr.trim().replace(',', '.')) || -46.633308;
  const mapsUrl = `https://www.google.com/maps?q=${currentLatNum},${currentLonNum}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLonNum - 0.008}%2C${currentLatNum - 0.006}%2C${currentLonNum + 0.008}%2C${currentLatNum + 0.006}&layer=mapnik&marker=${currentLatNum}%2C${currentLonNum}`;

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

            {/* Opção 1: Busca por Endereço / CEP */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-border-subtle space-y-2">
              <label className="block text-xs font-bold text-navy-deep flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">search</span>
                <span>Buscar Coordenadas por Endereço ou CEP</span>
              </label>
              <form onSubmit={handleSearchAddress} className="flex gap-2">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000, São Paulo ou 01310-100"
                  className="flex-1 p-2.5 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs text-navy-deep focus:border-navy-deep outline-none"
                />
                <button
                  type="submit"
                  disabled={searchingAddress || !addressQuery.trim()}
                  className="px-4 py-2.5 bg-secondary text-white font-bold rounded-lg text-xs hover:brightness-110 active:translate-y-px transition shadow-sm disabled:opacity-50 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {searchingAddress ? 'sync' : 'search'}
                  </span>
                  <span>{searchingAddress ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </form>

              {/* Sugestões de Endereço */}
              {addressResults.length > 0 && (
                <div className="mt-2 space-y-1 bg-surface-card p-2 rounded-lg border border-border-subtle shadow-sm max-h-48 overflow-y-auto">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant px-1">
                    Selecione o local correto:
                  </span>
                  {addressResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAddress(item)}
                      className="w-full text-left p-2 hover:bg-secondary-container/40 rounded text-xs text-navy-deep transition flex items-center justify-between gap-2 border-b border-border-subtle last:border-0"
                    >
                      <span className="truncate flex-1 font-medium">{item.displayName}</span>
                      <span className="text-[10px] font-mono text-secondary shrink-0 font-bold">
                        Selecionar &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Opção 2: Smart Paste Box */}
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-subtle space-y-1.5">
              <label className="block text-xs font-bold text-navy-deep flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[16px]">content_paste</span>
                <span>Ou Cole as Coordenadas / Link do Google Maps</span>
              </label>
              <input
                type="text"
                value={smartPasteInput}
                onChange={(e) => handleSmartPaste(e.target.value)}
                placeholder="Ex: -23.550520, -46.633308 ou link do Google Maps"
                className="w-full p-2.5 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs text-navy-deep font-mono focus:border-navy-deep outline-none"
              />
            </div>

            {/* Formulário Manual */}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Latitude (GPS) *
                  </label>
                  <input
                    type="text"
                    value={latStr}
                    onChange={(e) => setLatStr(e.target.value)}
                    placeholder="-23.550520"
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                  <span className="text-[10px] text-on-surface-variant mt-0.5 block">Ex: -23.550520</span>
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Longitude (GPS) *
                  </label>
                  <input
                    type="text"
                    value={lonStr}
                    onChange={(e) => setLonStr(e.target.value)}
                    placeholder="-46.633308"
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                  <span className="text-[10px] text-on-surface-variant mt-0.5 block">Ex: -46.633308</span>
                </div>
              </div>

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
                <span>Visualização no Mapa Interativo</span>
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

              <p className="text-body-sm text-on-surface-variant">
                Qualquer batida de ponto registrada fora do raio de <strong>{hqRadiusMeters}m</strong> dessas coordenadas sem uma viagem vinculada gerará um alerta de <strong>"Fora da Sede"</strong> no dashboard administrativo.
              </p>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1 font-mono text-navy-deep">
                <p>LAT: {latStr}</p>
                <p>LON: {lonStr}</p>
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
                <span>Dica de Localização</span>
              </p>
              <p>
                Ao cadastrar no computador de escritório, o navegador pode estimar o local pelo provedor de internet (IP). Você pode usar o campo de <strong>Busca por Endereço/CEP</strong> acima ou copiar as coordenadas exatas do Google Maps.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
