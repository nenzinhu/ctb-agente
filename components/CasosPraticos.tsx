'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Caso } from '@/lib/mbft/casos';
import BotaoVoz, { AvisoVoz, useDitado } from './BotaoVoz';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import TitleCard from './ui/TitleCard';

const CHAVE_PLACAR = 'ctb-casos-placar';

const TEMAS = ['bafômetro', 'celular', 'moto', 'estacionar', 'velocidade', 'sem CNH'];

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
  const [busca, setBusca] = useState('');
  /** Topic in use; '' = any infraction */
  const [tema, setTema] = useState('');
  const ditado = useDitado({ onTranscricao: (t) => setBusca((atual) => (atual ? `${atual} ${t}` : t)) });

  /** Loads a case; the topic only sticks when it has cases, so a miss keeps the current one. */
  const proximo = useCallback(async (novoTema: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const url = novoTema ? `/api/casos?tema=${encodeURIComponent(novoTema)}` : '/api/casos';
      const resposta = await fetch(url, { cache: 'no-store' });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível carregar o caso.');
      setCaso(corpo as Caso);
      setEscolha(null);
      setTema(novoTema);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPlacar(lerPlacar());
    void proximo('');
  }, [proximo]);

  const treinar = (texto: string) => {
    const t = texto.trim();
    if (!t || carregando) return;
    setBusca(t);
    void proximo(t);
  };

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

      <form
        className="card card-pad space-y-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          treinar(busca);
        }}
      >
        <Field
          label="Treinar sobre…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          maxLength={120}
          enterKeyHint="search"
          placeholder="Ex.: celular, bafômetro, zap, 516-91, art. 181"
          hint="Tema, gíria, código ou artigo. Deixe vazio para casos de todas as infrações."
          acao={<BotaoVoz ditado={ditado} />}
        />
        <AvisoVoz ditado={ditado} />
        <div className="flex flex-wrap gap-2">
          {TEMAS.map((t) => (
            <button key={t} type="button" className="chip" onClick={() => treinar(t)} disabled={carregando}>
              {t}
            </button>
          ))}
        </div>
        <PrimaryButton type="submit" icone="busca" disabled={!busca.trim()} className="w-full">
          Ver casos deste tema
        </PrimaryButton>
      </form>

      {tema && (
        <p className="flex items-center gap-2 text-sm text-ds-text">
          <span className="badge-neutral">Tema: {tema}</span>
          <button
            type="button"
            className="text-xs font-semibold text-ds-ink underline"
            onClick={() => {
              setBusca('');
              void proximo('');
            }}
          >
            Todas as infrações
          </button>
        </p>
      )}

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
        onClick={() => void proximo(tema)}
        className="w-full text-base"
      >
        {caso && !escolha ? 'Pular este caso' : 'Próximo caso'}
      </PrimaryButton>
    </div>
  );
}
