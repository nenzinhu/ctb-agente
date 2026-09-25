'use client';

import { useEffect, useRef, useState } from 'react';
import Icone from './ui/Icone';

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
    <div className="sm:w-auto">
      <button
        type="button"
        onClick={gravando ? parar : iniciar}
        disabled={ocupado}
        aria-pressed={gravando}
        className={`${gravando ? 'btn border border-danger bg-danger/10 text-danger' : 'btn-secondary'} w-full sm:w-auto`}
      >
        <Icone nome={gravando ? 'x' : 'microfone'} tamanho={18} />
        {gravando ? 'Parar e transcrever' : ocupado ? 'Transcrevendo…' : 'Ditar por voz'}
      </button>

      {gravando && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-danger" role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden />
          Gravando… fale a consulta (máx. {maxSegundos}s).
        </p>
      )}

      {erro && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
