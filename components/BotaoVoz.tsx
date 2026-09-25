'use client';

import { useEffect, useRef, useState } from 'react';
import IconButton from './ui/IconButton';

type Estado = 'idle' | 'gravando' | 'transcrevendo' | 'erro';

export interface Ditado {
  /** False when the browser has no MediaRecorder: the controls stay hidden */
  suportado: boolean;
  estado: Estado;
  erro: string | null;
  maxSegundos: number;
  /** Start recording, or stop and transcribe */
  alternar: () => void;
}

interface OpcoesDitado {
  onTranscricao: (texto: string) => void;
  maxSegundos?: number;
}

/**
 * Push-to-talk dictation: records the agent's voice and hands back the
 * transcript. The state lives here so the microphone can sit beside a field
 * (BotaoVoz) while the status is shown under it (AvisoVoz).
 */
export function useDitado({ onTranscricao, maxSegundos = 60 }: OpcoesDitado): Ditado {
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

  return {
    suportado,
    estado,
    erro,
    maxSegundos,
    alternar: () => (estado === 'gravando' ? parar() : void iniciar()),
  };
}

/**
 * Microphone toggle for a field's action slot. Stays pressed (and red) while
 * recording; a second tap stops and transcribes.
 */
export default function BotaoVoz({ ditado }: { ditado: Ditado }) {
  if (!ditado.suportado) return null;

  const gravando = ditado.estado === 'gravando';
  const ocupado = ditado.estado === 'transcrevendo';

  return (
    <IconButton
      icone={gravando ? 'x' : 'microfone'}
      rotulo="Ditar por voz"
      title={gravando ? 'Parar e transcrever' : 'Ditar por voz'}
      tom={gravando ? 'perigo' : 'primario'}
      aria-pressed={gravando}
      aria-busy={ocupado || undefined}
      disabled={ocupado}
      onClick={ditado.alternar}
    />
  );
}

/**
 * Recording status and dictation errors, announced to screen readers. The
 * status region is always rendered so its changes are read out.
 */
export function AvisoVoz({ ditado }: { ditado: Ditado }) {
  if (!ditado.suportado) return null;

  return (
    <>
      <p role="status" aria-live="polite" className="hint flex items-center gap-1.5 empty:mt-0">
        {ditado.estado === 'gravando' && (
          <>
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-ds-danger" aria-hidden />
            Gravando… fale agora (máx. {ditado.maxSegundos}s). Toque no microfone para parar.
          </>
        )}
        {ditado.estado === 'transcrevendo' && 'Transcrevendo o áudio…'}
      </p>
      {ditado.erro && (
        <p className="field-error" role="alert">
          {ditado.erro}
        </p>
      )}
    </>
  );
}
