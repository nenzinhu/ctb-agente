import { formatarResposta, type Trecho } from '@/lib/rag/formatar-resposta';
import Icone, { type NomeIcone } from '../ui/Icone';

function Inline({ trechos }: { trechos: Trecho[] }) {
  return (
    <>
      {trechos.map((t, i) => {
        if (t.tipo === 'negrito') return <strong key={i}>{t.valor}</strong>;
        if (t.tipo === 'citacao') {
          return (
            <a
              key={i}
              href={`#fonte-${t.n}`}
              className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded-md bg-brand-soft px-1 align-text-top text-[11px] font-bold text-brand no-underline hover:bg-brand hover:text-brand-ink"
              aria-label={`Fonte ${t.n}`}
            >
              {t.n}
            </a>
          );
        }
        return <span key={i}>{t.valor}</span>;
      })}
    </>
  );
}

/** The sections the POP answer is organized in, each with its own mark. */
function iconeDaSecao(titulo: string): NomeIcone {
  const nome = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (nome.startsWith('resumo')) return 'faisca';
  if (nome.startsWith('passo')) return 'lista';
  if (nome.startsWith('atencao') || nome.startsWith('erros')) return 'alerta';
  if (nome.startsWith('base legal') || nome.startsWith('fundamenta')) return 'balanca';
  return 'info';
}

/**
 * The model's answer rendered as React elements — never as HTML.
 */
export default function RespostaFormatada({ texto }: { texto: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-ink">
      {formatarResposta(texto).map((bloco, i) => {
        if (bloco.tipo === 'titulo') {
          const icone = iconeDaSecao(bloco.valor);
          return (
            <h3
              key={i}
              className={`flex items-center gap-2 pt-2 text-sm font-semibold uppercase tracking-wide first:pt-0 ${
                icone === 'alerta' ? 'text-warn' : 'text-brand'
              }`}
            >
              <Icone nome={icone} tamanho={16} />
              {bloco.valor}
            </h3>
          );
        }
        if (bloco.tipo === 'paragrafo') {
          return (
            <p key={i}>
              <Inline trechos={bloco.conteudo} />
            </p>
          );
        }
        const Lista = bloco.tipo === 'numerada' ? 'ol' : 'ul';
        return (
          <Lista key={i} className={`space-y-1.5 pl-5 ${bloco.tipo === 'numerada' ? 'list-decimal' : 'list-disc'}`}>
            {bloco.itens.map((item, j) => (
              <li key={j}>
                <Inline trechos={item} />
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
