'use client';

import { useEffect, useRef, useState } from 'react';

interface BotaoVozProps {
  onTranscricao: (texto: string) => void;
  maxSegundos?: number;
}

type Estado = 'idle' | 'gravando' | 'transcrevendo' | 'erro';

/**
 * Push-to-talk button: records the agent's voice and returns the transcript.
 * Hidden when the browser has no MediaRecorder support.
 */
export default function BotaoVoz({ onTranscricao, maxSegundos = 60 }: BotaoVozProps) {
  const [suportado, setSuportado] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [erro, setErro] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSuportado(
      typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia)
    );

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const enviar = async (blob: Blob) => {
    setEstado('transcrevendo');
    setErro(null);

    try {
      const form = new FormData();
      form.append('audio', blob, 'consulta.webm');

      const response = await fetch('/api/transcribe', { method: 'POST', body: form });
      const data = (await response.json()) as { text?: string; message?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.message || 'Não foi possível transcrever o áudio.');
      }

      onTranscricao(data.text);
      setEstado('idle');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao transcrever.');
      setEstado('erro');
    }
  };

  const iniciar = async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          void enviar(blob);
        } else {
          setEstado('idle');
        }
      };

      recorder.start();
      setEstado('gravando');

      timeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, maxSegundos * 1000);
    } catch {
      setErro('Permissão de microfone negada ou indisponível.');
      setEstado('erro');
    }
  };

  const parar = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  if (!suportado) return null;

  const gravando = estado === 'gravando';
  const ocupado = estado === 'transcrevendo';

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={gravando ? parar : iniciar}
        disabled={ocupado}
        aria-pressed={gravando}
        className={`w-full rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
          gravando
            ? 'border-red-600 bg-red-50 text-red-700'
            : 'border-ctb-green text-ctb-green hover:bg-ctb-green/10'
        }`}
      >
        {gravando
          ? '⏹️ Parar e transcrever'
          : ocupado
            ? 'Transcrevendo…'
            : '🎤 Ditar consulta por voz'}
      </button>

      {gravando && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300" role="status">
          Gravando… fale a consulta (máx. {maxSegundos}s).
        </p>
      )}

      {erro && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
