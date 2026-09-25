import { formatarResposta, type Trecho } from '@/lib/rag/formatar-resposta';

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

/**
 * The model's answer rendered as React elements — never as HTML.
 */
export default function RespostaFormatada({ texto }: { texto: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-ink">
      {formatarResposta(texto).map((bloco, i) => {
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
