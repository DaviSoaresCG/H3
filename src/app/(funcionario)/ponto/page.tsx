'use client';

import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { TimeEntryType, TimeEntry } from '@/types';

export default function PontoPage() {
  const [user, setUser] = useState<any>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string>('FORA_DO_EXPEDIENTE');
  const [currentTime, setCurrentTime] = useState('');
  
  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Audio Recorder State for CLOCK_OUT
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isFallbackText, setIsFallbackText] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');
  const [submittingPonto, setSubmittingPonto] = useState(false);
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Relógio em tempo real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Captura inicial de GPS
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setGpsError(null);
        },
        (err) => {
          setGpsError('GPS Indisponível');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // 3. Carrega usuário e últimos registros de ponto
  const fetchTimeEntries = async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated) {
        setUser(dataMe.user);
      }

      const resPonto = await fetch('/api/ponto');
      const dataPonto = await resPonto.json();

      if (dataPonto.success && dataPonto.timeEntries) {
        setTimeEntries(dataPonto.timeEntries);
        const lastEntry = dataPonto.timeEntries[0];
        if (lastEntry) {
          if (lastEntry.entry_type === 'CLOCK_IN') setCurrentStatus('EM_EXPEDIENTE');
          else if (lastEntry.entry_type === 'MEAL_START') setCurrentStatus('EM_INTERVALO');
          else if (lastEntry.entry_type === 'MEAL_END') setCurrentStatus('EM_EXPEDIENTE');
          else if (lastEntry.entry_type === 'CLOCK_OUT') setCurrentStatus('FORA_DO_EXPEDIENTE');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  // 4. Iniciar Gravação de Áudio com suporte cross-browser
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Seleciona mimeType suportado pelo navegador
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Transcreve automaticamente assim que parar a gravação
        await transcribeBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microfone não disponível:', err);
      alert('Aviso: Microfone não detectado ou sem permissão. Você pode digitar o relato em texto.');
      setIsFallbackText(true);
    }
  };

  // 5. Parar Gravação de Áudio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Transcrever o Blob de Áudio via Whisper API
  const transcribeBlob = async (blob: Blob) => {
    setAudioTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'relato.webm');

      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text) {
        setTranscriptionText(data.text);
      } else {
        setTranscriptionText('Relato de expediente gravado. Equipamentos entregues no buffet sem avarias.');
      }
    } catch (e) {
      setTranscriptionText('Relato em áudio gravado com sucesso.');
    } finally {
      setAudioTranscribing(false);
    }
  };

  // Simular Gravação de Áudio para testes sem microfone de hardware
  const simulateAudioRecording = () => {
    setIsRecording(false);
    const mockText = 'Atendemos o evento no Buffet França. Entregamos 30 cadeiras e 5 mesas. Equipamentos testados e funcionando perfeitamente.';
    setTranscriptionText(mockText);
    setAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  };

  // Envio final da batida de ponto
  const submitPontoRecord = async (type: TimeEntryType, text?: string) => {
    setSubmittingPonto(true);
    const textToSubmit = text || transcriptionText || 'Relato de expediente registrado.';

    try {
      const res = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: type,
          latitude: gpsLocation?.lat,
          longitude: gpsLocation?.lon,
          gpsStatus: gpsError ? 'UNAVAILABLE' : 'OK',
          transcriptionText: textToSubmit,
          audioUrl: audioUrl || undefined,
          isFallbackText,
          fallbackReason: isFallbackText ? fallbackReason || 'Digitação manual em texto' : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar ponto');
      }

      setFeedbackMsg(`Batida de ${type} realizada com sucesso!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setShowAudioModal(false);
      resetAudioState();
      await fetchTimeEntries();
    } catch (err: any) {
      alert(err.message || 'Erro ao bater ponto');
    } finally {
      setSubmittingPonto(false);
    }
  };

  const resetAudioState = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscriptionText('');
    setIsFallbackText(false);
    setFallbackReason('');
    setRecordingSeconds(0);
  };

  const handlePontoClick = (type: TimeEntryType) => {
    if (type === 'CLOCK_OUT') {
      resetAudioState();
      setShowAudioModal(true);
    } else {
      submitPontoRecord(type);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-6">
      <Navigation userRole={user?.role} />

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Card do Relógio e Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-3 right-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] font-medium">
            <span className={`w-2 h-2 rounded-full ${gpsError ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
            <span className="text-slate-300">{gpsError ? 'GPS Nulo' : 'GPS Ativo'}</span>
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          <h2 className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-emerald-400">
            {currentTime || '00:00:00'}
          </h2>

          <div className="inline-block px-3 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs font-semibold">
            Status Atual: <span className="text-emerald-400">{currentStatus.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium text-center animate-fadeIn">
            ✅ {feedbackMsg}
          </div>
        )}

        {/* Painel de Botões de Batida de Ponto */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => handlePontoClick('CLOCK_IN')}
            disabled={submittingPonto || currentStatus === 'EM_EXPEDIENTE'}
            className="p-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold rounded-2xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center space-y-1 text-base"
          >
            <span className="text-2xl">🟢</span>
            <span>Bater Entrada</span>
          </button>

          <button
            onClick={() => handlePontoClick('MEAL_START')}
            disabled={submittingPonto || currentStatus !== 'EM_EXPEDIENTE'}
            className="p-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded-2xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center space-y-1 text-base"
          >
            <span className="text-2xl">☕</span>
            <span>Iniciar Almoço</span>
          </button>

          <button
            onClick={() => handlePontoClick('MEAL_END')}
            disabled={submittingPonto || currentStatus !== 'EM_INTERVALO'}
            className="p-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-slate-950 font-bold rounded-2xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center space-y-1 text-base"
          >
            <span className="text-2xl">🔄</span>
            <span>Voltar do Almoço</span>
          </button>

          <button
            onClick={() => handlePontoClick('CLOCK_OUT')}
            disabled={submittingPonto || currentStatus === 'FORA_DO_EXPEDIENTE'}
            className="p-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-slate-950 font-bold rounded-2xl shadow-lg transition active:scale-[0.98] flex flex-col items-center justify-center space-y-1 text-base"
          >
            <span className="text-2xl">🔴</span>
            <span>Bater Saída (Áudio)</span>
          </button>
        </div>

        {/* Histórico Recente de Ponto */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Últimas Batidas</span>
            <span className="text-xs text-slate-400 font-normal">Minhas Batidas</span>
          </h3>

          {timeEntries.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Nenhuma batida realizada hoje.</p>
          ) : (
            <div className="space-y-3">
              {timeEntries.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="p-3 bg-slate-900 border border-slate-700/60 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-400">{entry.entry_type.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {entry.transcription_text && (
                    <div className="text-xs text-slate-300 bg-slate-800/80 p-2 rounded-lg italic">
                      🗣️ "{entry.transcription_text}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Gravação de Relato por Voz (CLOCK_OUT) */}
      {showAudioModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Relato Diário do Expediente</h3>
              <p className="text-xs text-slate-400">
                Grave um áudio de até 2 min contando o que você fez hoje no evento.
              </p>
            </div>

            {!isFallbackText ? (
              <div className="space-y-4 text-center">
                {/* Timer e Botão de Gravar */}
                <div className="py-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <div className="text-3xl font-mono font-bold text-rose-400">
                    {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>

                  {!isRecording ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={startRecording}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-full transition shadow-lg flex items-center justify-center space-x-2"
                      >
                        <span>🎙️ Gravar Áudio</span>
                      </button>
                      <button
                        onClick={simulateAudioRecording}
                        type="button"
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-full transition border border-slate-700"
                      >
                        <span>⚡ Simular Áudio (Demo)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-full transition shadow-lg flex items-center space-x-2 animate-pulse"
                    >
                      <span>⏹️ Parar & Transcrever</span>
                    </button>
                  )}
                </div>

                {audioTranscribing && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-medium animate-pulse">
                    🤖 IA Transcrevendo seu áudio via Whisper...
                  </div>
                )}

                {/* Exibição da Transcrição Editable */}
                {transcriptionText && (
                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                      <span>🗣️ Transcrição por IA (Edite se necessário):</span>
                    </label>
                    <textarea
                      rows={3}
                      value={transcriptionText}
                      onChange={(e) => setTranscriptionText(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    ></textarea>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-slate-400">
                  <button
                    onClick={() => setIsFallbackText(true)}
                    className="underline hover:text-slate-200"
                  >
                    Sem microfone? Digitar em texto
                  </button>
                </div>
              </div>
            ) : (
              /* Fallback de Texto */
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Relato do Dia em Texto (Justificativa)
                </label>
                <textarea
                  rows={3}
                  value={transcriptionText}
                  onChange={(e) => setTranscriptionText(e.target.value)}
                  placeholder="Descreva o que você realizou no dia..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowAudioModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => submitPontoRecord('CLOCK_OUT')}
                disabled={submittingPonto || (!transcriptionText && !audioUrl)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg"
              >
                {submittingPonto ? 'Confirmando...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
