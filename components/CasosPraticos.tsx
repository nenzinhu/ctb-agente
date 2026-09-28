'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Caso } from '@/lib/mbft/casos';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import TitleCard from './ui/TitleCard';

const CHAVE_PLACAR = 'ctb-casos-placar';

interface Placar {
  acertos: number;
  total: number;
}

function lerPlacar(): Placar {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_PLACAR) ?? 'null') as Placar | null;
    if (salvo && Number.isFinite(salvo.acertos) && Number.isFinite(salvo.total)) return salvo;
  } catch {
    // storage blocked or corrupted: start from zero
  }
  return { acertos: 0, total: 0 };
}

/**
 * Practice: a real scene from the MBFT examples, four look-alike framings,
 * instant feedback. The score stays on this device.
 */
export default function CasosPraticos() {
  const [caso, setCaso] = useState<Caso | null>(null);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [placar, setPlacar] = useState<Placar>({ acertos: 0, total: 0 });

  const proximo = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch('/api/casos', { cache: 'no-store' });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível carregar o caso.');
      setCaso(corpo as Caso);
      setEscolha(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPlacar(lerPlacar());
    void proximo();
  }, [proximo]);

  const responder = (codigo: string) => {
    if (!caso || escolha) return;
    setEscolha(codigo);
    const novo = { acertos: placar.acertos + (codigo === caso.correta ? 1 : 0), total: placar.total + 1 };
    setPlacar(novo);
    try {
      localStorage.setItem(CHAVE_PLACAR, JSON.stringify(novo));
    } catch {
      // score just isn't kept on this device
    }
  };

  const acertou = caso && escolha === caso.correta;

  return (
    <div className="space-y-6">
      <TitleCard
        titulo="Casos práticos"
        icone="check"
        subtitulo="Leia a situação, como ela foi escrita no campo de observações do AIT, e escolha o enquadramento certo."
      />

      <p className="text-sm text-ds-subtle" aria-live="polite">
        Placar neste aparelho: <strong className="text-ds-text">{placar.acertos}</strong> de {placar.total}
      </p>

      {erro && (
        <p className="field-error" role="alert">
          {erro}
        </p>
      )}

      {caso && (
        <article className="card card-pad space-y-4">
          <div>
            <p className="label">A situação</p>
            <p className="text-base leading-relaxed text-ds-text">“{caso.cena}”</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="label">Qual é o enquadramento?</legend>
            {caso.opcoes.map((o) => {
              const certa = escolha && o.codigo === caso.correta;
              const errada = escolha === o.codigo && o.codigo !== caso.correta;
              return (
                <button
                  key={o.codigo}
                  type="button"
                  onClick={() => responder(o.codigo)}
                  disabled={Boolean(escolha)}
                  aria-pressed={escolha === o.codigo}
                  className={`flex w-full items-start gap-3 rounded-control border-2 p-3 text-left text-sm transition-colors ${
                    certa
                      ? 'border-ds-primary bg-ds-primary-soft'
                      : errada
                        ? 'border-ds-danger'
                        : 'border-ds-line hover:border-ds-border'
                  }`}
                >
                  {escolha && (
                    <Icone
                      nome={certa ? 'check' : errada ? 'x' : 'info'}
                      tamanho={18}
                      className={`mt-0.5 shrink-0 ${certa ? 'text-ds-primary' : errada ? 'text-ds-danger' : 'text-ds-subtle'}`}
                    />
                  )}
                  <span>
                    <span className="block text-ds-text">{o.rotulo}</span>
                    {escolha && (
                      <span className="mt-0.5 block font-mono text-xs text-ds-subtle">
                        {o.codigo} · {o.amparo}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </fieldset>

          {escolha && (
            <div className="space-y-3" role="status">
              <p className={`font-semibold ${acertou ? 'text-ds-primary' : 'text-ds-danger'}`}>
                {acertou ? 'Acertou!' : `Não foi dessa vez. O certo é ${caso.correta}.`} Infração {caso.gravidade.toLowerCase()}.
              </p>
              {caso.explicacao && (
                <p className="text-sm text-ds-subtle">
                  <span className="font-semibold text-ds-text">Explicando fácil: </span>
                  {caso.explicacao}
                </p>
              )}
              <Link href={`/consulta?q=${encodeURIComponent(caso.correta)}`} className="text-sm font-semibold text-ds-ink underline">
                Ver a ficha completa de {caso.correta}
              </Link>
            </div>
          )}
        </article>
      )}

      <PrimaryButton
        type="button"
        icone="seta"
        carregando={carregando}
        textoCarregando="Carregando caso…"
        onClick={() => void proximo()}
        className="w-full text-base"
      >
        {caso && !escolha ? 'Pular este caso' : 'Próximo caso'}
      </PrimaryButton>
    </div>
  );
}
