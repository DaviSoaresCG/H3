'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimeEntryType, StoredTimeEntry, User } from '@/types';
import { determineEmployeeStatus, EmployeeWorkStatus } from '@/lib/ponto-validator';

export default function PontoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<StoredTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<EmployeeWorkStatus>('FORA_DO_EXPEDIENTE');
  
  // Real-time Clock & Date
  const [currentTime, setCurrentTime] = useState('--:--');
  const [currentSeconds, setCurrentSeconds] = useState('--s');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');

  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'OK' | 'UNAVAILABLE'>('OK');

  // Audio Recorder State for CLOCK_OUT
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isFallbackText, setIsFallbackText] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');
  const [submittingPonto, setSubmittingPonto] = useState(false);
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Relógio em tempo real e formatação de data
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      setCurrentTime(`${hours}:${minutes}`);
      setCurrentSeconds(`${seconds}s`);

      const formattedDate = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      });
      // Capitalize first letter
      setCurrentDateFormatted(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
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
          setGpsStatus('OK');
        },
        () => {
          setGpsStatus('UNAVAILABLE');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // 3. Carrega usuário e últimos registros de ponto
  const fetchTimeEntries = useCallback(async () => {
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.authenticated && dataMe.user) {
        setUser(dataMe.user);
      }

      const resPonto = await fetch('/api/ponto');
      const dataPonto = await resPonto.json();

      if (dataPonto.success && dataPonto.timeEntries) {
        setTimeEntries(dataPonto.timeEntries);
        const lastEntry = dataPonto.timeEntries[0];
        const calculatedStatus = determineEmployeeStatus(lastEntry?.entry_type);
        setCurrentStatus(calculatedStatus);
      }
    } catch (e) {
      console.error('Erro ao buscar dados de ponto:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  // 4. Iniciar Gravação de Áudio Real
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options: MediaRecorderOptions = {};
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
        await transcribeBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setIsFallbackText(true);
      setFeedbackMsg({
        type: 'error',
        text: 'Microfone não acessível. Você pode enviar o relato por texto digitado com justificativa.',
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

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
        setTranscriptionText('Relato de encerramento do dia gravado com sucesso.');
      }
    } catch {
      setTranscriptionText('Relato em áudio gravado.');
    } finally {
      setAudioTranscribing(false);
    }
  };

  // Simulação rápida para demonstração / ambientes sem microfone
  const simulateAudioRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(28);
    const mockText =
      'Montagem do evento no espaço Villa Lobos concluída. 40 banquetas, 10 mesas bistrô e som instalados. Sem avarias.';
    setTranscriptionText(mockText);
    setAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  };

  const resetAudioState = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscriptionText('');
    setIsFallbackText(false);
    setFallbackReason('');
    setRecordingSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // 5. Envio do Ponto para o Backend
  const submitPontoRecord = async (type: TimeEntryType, overrideText?: string) => {
    setSubmittingPonto(true);
    const textToSubmit = overrideText || transcriptionText || 'Relato de expediente registrado.';

    let currentLat = gpsLocation?.lat || null;
    let currentLon = gpsLocation?.lon || null;
    let currentGpsStatus: 'OK' | 'UNAVAILABLE' = gpsStatus;

    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;
        currentGpsStatus = 'OK';
        setGpsLocation({ lat: currentLat, lon: currentLon });
        setGpsStatus('OK');
      } catch {
        currentGpsStatus = 'UNAVAILABLE';
        setGpsStatus('UNAVAILABLE');
      }
    }

    try {
      const res = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: type,
          latitude: currentLat,
          longitude: currentLon,
          gpsStatus: currentGpsStatus,
          transcriptionText: type === 'CLOCK_OUT' ? textToSubmit : undefined,
          audioUrl: type === 'CLOCK_OUT' ? audioUrl || undefined : undefined,
          isFallbackText: type === 'CLOCK_OUT' ? isFallbackText : undefined,
          fallbackReason: type === 'CLOCK_OUT' && isFallbackText ? fallbackReason || 'Digitação em texto' : undefined,
          durationSeconds: type === 'CLOCK_OUT' ? recordingSeconds || 0 : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar ponto');
      }

      setFeedbackMsg({
        type: 'success',
        text: `Batida de ${formatEntryTypeLabel(type)} registrada com sucesso!`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      setShowAudioModal(false);
      resetAudioState();
      await fetchTimeEntries();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Erro ao registrar ponto',
      });
    } finally {
      setSubmittingPonto(false);
    }
  };

  const handleMainPunchClick = () => {
    if (currentStatus === 'FORA_DO_EXPEDIENTE') {
      submitPontoRecord('CLOCK_IN');
    } else if (currentStatus === 'EM_EXPEDIENTE') {
      resetAudioState();
      setShowAudioModal(true);
    } else if (currentStatus === 'EM_INTERVALO') {
      submitPontoRecord('MEAL_END');
    }
  };

  const formatEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'CLOCK_IN':
        return 'Entrada';
      case 'MEAL_START':
        return 'Início Almoço';
      case 'MEAL_END':
        return 'Retorno Almoço';
      case 'CLOCK_OUT':
        return 'Saída';
      default:
        return type;
    }
  };

  const formatSecondsToMinutes = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const lastEntry = timeEntries[0];

  return (
    <div className="flex flex-col items-center w-full min-h-[calc(100vh-140px)] justify-between space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`w-full max-w-sm p-3.5 rounded-lg border text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn shadow-soft ${
            feedbackMsg.type === 'success'
              ? 'bg-secondary-container/40 border-secondary text-on-secondary-container'
              : 'bg-error-container/60 border-error text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {feedbackMsg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="flex-1">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Status (Date & GPS) */}
      <div className="w-full flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-body-sm font-body-sm text-on-surface-variant">
            {currentDateFormatted || 'Hoje'}
          </span>
          <span className="text-body-md font-body-md font-bold text-navy-deep">
            {user?.name ? `Olá, ${user.name.split(' ')[0]}` : 'Turno Operacional'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-surface-card border border-border-subtle px-3 py-1.5 rounded-full shadow-soft">
          <span
            className={`material-symbols-outlined text-[16px] ${
              gpsStatus === 'OK' ? 'text-success-vibrant' : 'text-alert-warning'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {gpsStatus === 'OK' ? 'satellite_alt' : 'signal_disconnected'}
          </span>
          <span
            className={`text-label-bold font-label-bold ${
              gpsStatus === 'OK' ? 'text-success-vibrant' : 'text-alert-warning'
            }`}
          >
            {gpsStatus === 'OK' ? 'GPS ATIVO' : 'SEM GPS'}
          </span>
        </div>
      </div>

      {/* Central Clock & Main Punch Action */}
      <div className="flex flex-col items-center justify-center w-full my-auto max-w-sm">
        {/* Digital Clock */}
        <div className="mb-8 text-center">
          <div className="text-5xl sm:text-6xl font-black text-navy-deep tracking-tight leading-none">
            {currentTime}
          </div>
          <div className="text-body-md font-body-md text-on-surface-variant font-mono mt-1">
            {currentSeconds}
          </div>
        </div>

        {/* Big Circular Punch Button */}
        <button
          onClick={handleMainPunchClick}
          disabled={submittingPonto || loading}
          className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full text-on-secondary shadow-soft active:scale-95 active:translate-y-[1px] active:shadow-none transition-all duration-150 flex flex-col items-center justify-center border-4 border-surface-card disabled:opacity-50 ${
            currentStatus === 'EM_EXPEDIENTE'
              ? 'bg-alert-warning hover:brightness-105'
              : currentStatus === 'EM_INTERVALO'
              ? 'bg-navy-deep hover:brightness-110'
              : 'bg-success-vibrant hover:brightness-105'
          }`}
          id="btn-punch"
        >
          {submittingPonto ? (
            <>
              <span className="material-symbols-outlined text-[44px] animate-spin mb-1">sync</span>
              <span className="text-sm font-bold text-on-secondary">REGISTRANDO...</span>
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined text-[44px] sm:text-[48px] mb-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {currentStatus === 'FORA_DO_EXPEDIENTE'
                  ? 'touch_app'
                  : currentStatus === 'EM_EXPEDIENTE'
                  ? 'mic'
                  : 'restaurant'}
              </span>
              <span className="text-headline-md font-headline-md font-bold text-on-secondary text-center px-2 leading-tight">
                {currentStatus === 'FORA_DO_EXPEDIENTE'
                  ? 'BATER ENTRADA'
                  : currentStatus === 'EM_EXPEDIENTE'
                  ? 'BATER SAÍDA'
                  : 'VOLTA ALMOÇO'}
              </span>
            </>
          )}
        </button>

        {/* Secondary Action: Meal Start during working hours */}
        {currentStatus === 'EM_EXPEDIENTE' && (
          <button
            onClick={() => submitPontoRecord('MEAL_START')}
            disabled={submittingPonto}
            className="mt-5 px-4 py-2 bg-surface-card hover:bg-surface-container border border-border-subtle rounded-full text-body-sm font-semibold text-on-surface-variant flex items-center gap-2 shadow-sm active:translate-y-px transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">restaurant</span>
            <span>Iniciar Intervalo de Almoço</span>
          </button>
        )}
      </div>

      {/* Bottom Area: Quick History & Audio Trigger */}
      <div className="w-full max-w-sm space-y-3">
        {/* Quick History Card */}
        <div className="w-full bg-surface-card border border-border-subtle rounded-xl p-4 flex items-center gap-4 border-l-4 border-l-success-vibrant shadow-sm">
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-success-vibrant">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              schedule
            </span>
          </div>
          <div className="flex flex-col flex-grow">
            <span className="text-body-sm font-body-sm text-on-surface-variant">Última batida</span>
            <span className="text-body-md font-body-md font-bold text-navy-deep">
              {lastEntry
                ? `${new Date(lastEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${formatEntryTypeLabel(
                    lastEntry.entry_type
                  )})`
                : 'Nenhum registro hoje'}
            </span>
          </div>
          <span className="text-body-sm font-body-sm text-outline">Hoje</span>
        </div>

        {/* Audio Report Action Button (INV-01) */}
        {currentStatus === 'EM_EXPEDIENTE' && (
          <button
            onClick={() => {
              resetAudioState();
              setShowAudioModal(true);
            }}
            className="w-full bg-surface-card border border-border-subtle rounded-xl p-4 flex items-center gap-4 shadow-sm active:scale-98 transition-transform hover:border-alert-warning"
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-alert-warning opacity-20 pulse-animation"></div>
              <div className="relative w-10 h-10 rounded-full bg-alert-warning flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mic
                </span>
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-body-md font-body-md font-bold text-navy-deep">Relato de Atividades</span>
              <span className="text-body-sm font-body-sm text-on-surface-variant">Obrigatório no encerramento</span>
            </div>
            <span className="material-symbols-outlined text-outline ml-auto">chevron_right</span>
          </button>
        )}
      </div>

      {/* MODAL / BOTTOM SHEET DE RELATO EM ÁUDIO (INV-01) */}
      {showAudioModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 border border-border-subtle shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-alert-warning text-on-primary flex items-center justify-center shadow-soft">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    mic
                  </span>
                </div>
                <div>
                  <h2 className="text-headline-md font-headline-md font-bold text-navy-deep">
                    Relato Diário de Saída
                  </h2>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    Grave um áudio resumindo o trabalho do dia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAudioModal(false)}
                className="text-on-surface-variant hover:text-navy-deep p-1 rounded-full"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Alternar entre Áudio e Fallback de Texto */}
            <div className="flex rounded-lg bg-surface-container p-1 text-body-sm font-semibold">
              <button
                type="button"
                onClick={() => setIsFallbackText(false)}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-all ${
                  !isFallbackText ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">mic</span>
                Gravação por Voz
              </button>
              <button
                type="button"
                onClick={() => setIsFallbackText(true)}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-all ${
                  isFallbackText ? 'bg-surface-card text-navy-deep shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">keyboard</span>
                Digitar Texto
              </button>
            </div>

            {!isFallbackText ? (
              /* SEÇÃO DE GRAVAÇÃO DE ÁUDIO */
              <div className="space-y-4 text-center">
                {/* Waveform / Visualizador */}
                <div className="h-20 bg-surface-container-low rounded-xl flex items-center justify-center gap-1.5 px-4 border border-border-subtle">
                  {isRecording && !isPaused ? (
                    <>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                    </>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
                      {audioUrl ? 'Áudio gravado com sucesso' : 'Pressione o microfone para gravar'}
                    </span>
                  )}
                </div>

                {/* Timer da Gravação */}
                <div className="text-2xl font-mono font-bold text-navy-deep">
                  {formatSecondsToMinutes(recordingSeconds)}
                </div>

                {/* Botões de Controle de Gravação */}
                <div className="flex items-center justify-center gap-4">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-16 h-16 rounded-full bg-alert-warning hover:brightness-105 text-on-primary flex items-center justify-center shadow-soft active:scale-95 transition-all"
                      title="Gravar"
                    >
                      <span
                        className="material-symbols-outlined text-[32px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        mic
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        className="w-12 h-12 rounded-full bg-surface-container-high text-navy-deep flex items-center justify-center active:scale-95 transition-all shadow-sm"
                        title={isPaused ? 'Continuar' : 'Pausar'}
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {isPaused ? 'play_arrow' : 'pause'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full bg-error text-on-error flex items-center justify-center shadow-soft active:scale-95 transition-all animate-pulse"
                        title="Concluir gravação"
                      >
                        <span className="material-symbols-outlined text-[32px]">stop</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Transcrição em andamento ou gerada */}
                {audioTranscribing && (
                  <div className="p-3 bg-surface-container rounded-lg flex items-center justify-center gap-2 text-body-sm text-on-surface-variant animate-fadeIn">
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    <span>Transcrevendo relato com IA (Whisper)...</span>
                  </div>
                )}

                {transcriptionText && !audioTranscribing && (
                  <div className="text-left space-y-1.5 animate-fadeIn">
                    <label className="text-body-sm font-semibold text-navy-deep flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                      Transcrição do Relato
                    </label>
                    <textarea
                      value={transcriptionText}
                      onChange={(e) => setTranscriptionText(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-sm text-on-surface focus:border-navy-deep outline-none"
                    />
                  </div>
                )}

                {/* Botão de Demonstração Rápida */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={simulateAudioRecording}
                    className="text-xs text-on-surface-variant hover:text-navy-deep underline"
                  >
                    Simular gravação de áudio (Ambiente Demo)
                  </button>
                </div>
              </div>
            ) : (
              /* SEÇÃO DE FALLBACK EM TEXTO */
              <div className="space-y-4">
                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Relato das Atividades do Dia *
                  </label>
                  <textarea
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    rows={3}
                    placeholder="Descreva as entregas, montagens e ocorrências atendidas hoje..."
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-sm text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                    Justificativa de Digitação em Texto * (INV-01)
                  </label>
                  <input
                    type="text"
                    value={fallbackReason}
                    onChange={(e) => setFallbackReason(e.target.value)}
                    placeholder="Ex: Microfone com defeito, ambiente com ruído extremo..."
                    className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-sm text-on-surface focus:border-navy-deep outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Ações Finais do Modal */}
            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setShowAudioModal(false)}
                className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg transition-colors text-body-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => submitPontoRecord('CLOCK_OUT')}
                disabled={
                  submittingPonto ||
                  audioTranscribing ||
                  (!transcriptionText && !audioUrl) ||
                  (isFallbackText && !fallbackReason.trim())
                }
                className="flex-1 py-3 bg-success-vibrant hover:brightness-105 text-on-secondary font-bold rounded-lg shadow-soft active:translate-y-px transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-body-md"
              >
                {submittingPonto ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    <span>Gravando Saída...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Saída</span>
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
