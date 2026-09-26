import { formatarResposta, type Trecho } from '@/lib/rag/formatar-resposta';

function Inline({ trechos, prefixo }: { trechos: Trecho[]; prefixo: string }) {
  return (
    <>
      {trechos.map((t, i) => {
        if (t.tipo === 'negrito') return <strong key={i}>{t.valor}</strong>;
        if (t.tipo === 'citacao') {
          return (
            <a
              key={i}
              href={`#${prefixo}-${t.n}`}
              className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded-md bg-ds-primary-soft px-1 align-text-top font-mono text-[11px] font-bold text-ds-primary-strong no-underline hover:bg-ds-primary hover:text-ds-on-solid"
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
export default function RespostaFormatada({ texto, prefixo = 'fonte' }: { texto: string; /** id prefix of the cited sources */ prefixo?: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-ds-text">
      {formatarResposta(texto).map((bloco, i) => {
        if (bloco.tipo === 'paragrafo') {
          return (
            <p key={i}>
              <Inline trechos={bloco.conteudo} prefixo={prefixo} />
            </p>
          );
        }
        const Lista = bloco.tipo === 'numerada' ? 'ol' : 'ul';
        return (
          <Lista key={i} className={`space-y-1.5 pl-5 ${bloco.tipo === 'numerada' ? 'list-decimal' : 'list-disc'}`}>
            {bloco.itens.map((item, j) => (
              <li key={j}>
                <Inline trechos={item} prefixo={prefixo} />
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
