import { normalizarBusca } from '@/lib/search/sinonimos';
import type { TrechoFonteEstrangeiros } from './types';

export interface FonteEstrangeiros {
  id: string;
  titulo: string;
  orgao: string;
  arquivo: string;
  urlOficial: string;
  versao: string;
  vigenteDesde: string;
  conferidoEm: string;
  situacao: 'revisar';
}

export const FONTES_ESTRANGEIROS: FonteEstrangeiros[] = [
  {
    id: 'resolucao-contran-933-2022',
    titulo: 'Resolução CONTRAN nº 933/2022',
    orgao: 'Conselho Nacional de Trânsito',
    arquivo: '/documentos/estrangeiros/resolucao-contran-933-2022.pdf',
    urlOficial: 'https://www.in.gov.br/web/dou/-/resolucao-contran-n-933-de-28-de-marco-de-2022-390332383',
    versao: 'Publicada no DOU de 1º de abril de 2022',
    vigenteDesde: '2022-04-01',
    conferidoEm: '2026-10-12',
    situacao: 'revisar',
  },
  {
    id: 'decreto-86714-1981',
    titulo: 'Decreto nº 86.714/1981 — Convenção de Viena sobre Trânsito Viário',
    orgao: 'Presidência da República',
    arquivo: '/documentos/estrangeiros/decreto-86714-1981.pdf',
    urlOficial: 'https://www.planalto.gov.br/ccivil_03/decreto/1980-1989/d86714.htm',
    versao: 'Promulgação da Convenção de Viena sobre Trânsito Viário',
    vigenteDesde: '1981-10-29',
    conferidoEm: '2026-10-12',
    situacao: 'revisar',
  },
];

type TrechoBase = Omit<TrechoFonteEstrangeiros, 'titulo' | 'arquivo' | 'urlOficial' | 'score'>;

const TRECHOS: TrechoBase[] = [
  {
    id: 'r933-art2', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 2º', pagina: 1,
    texto: 'O condutor de veículo automotor, oriundo de país estrangeiro e nele habilitado, desde que penalmente imputável no Brasil, poderá dirigir no território nacional quando amparado por convenções ou acordos internacionais ratificados e aprovados pela República Federativa do Brasil e, igualmente, pela adoção do Princípio da Reciprocidade, no prazo máximo de 180 (cento e oitenta) dias, respeitada a validade da habilitação estrangeira de origem.',
  },
  {
    id: 'r933-art2-p1', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 2º, § 1º', pagina: 1,
    texto: 'O prazo de 180 dias inicia-se na data de entrada no território brasileiro. A fiscalização deve exigir documento de habilitação estrangeiro dentro da validade e documento de identificação, observadas as condições da Resolução.',
  },
  {
    id: 'r933-art2-p2', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 2º, §§ 2º a 4º', pagina: 1,
    texto: 'O condutor deve portar documento de habilitação estrangeiro, documento de identificação e comprovante da data de entrada no Brasil. A Permissão Internacional para Dirigir deve estar acompanhada da habilitação estrangeira que lhe deu origem.',
  },
  {
    id: 'r933-art3', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 3º', pagina: 2,
    texto: 'O condutor habilitado em país estrangeiro cuja habilitação não seja reconhecida pelo Brasil deve solicitar a habilitação brasileira e submeter-se aos exames previstos na legislação de trânsito.',
  },
  {
    id: 'r933-art4', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 4º', pagina: 2,
    texto: 'O brasileiro habilitado no exterior deve comprovar que mantinha residência normal naquele país por período não inferior a seis meses quando solicitar registro ou habilitação no Brasil, mediante documento consular ou equivalente.',
  },
  {
    id: 'r933-art6', fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 6º', pagina: 2,
    texto: 'Ao condutor estrangeiro que cometer infração cuja penalidade implique suspensão do direito de dirigir aplicam-se os procedimentos previstos no art. 42 da Convenção sobre Trânsito Viário, promulgada pelo Decreto nº 86.714/1981.',
  },
  {
    id: 'viena-art1', fonteId: 'decreto-86714-1981', referencia: 'Art. 1', pagina: 3,
    texto: 'Para os efeitos da Convenção, considera-se veículo em circulação internacional aquele que pertence a pessoa física ou jurídica com residência normal fora do Estado em que circula, não está matriculado nesse Estado e nele foi temporariamente importado.',
  },
  {
    id: 'viena-art41', fonteId: 'decreto-86714-1981', referencia: 'Art. 41', pagina: 18,
    texto: 'As Partes Contratantes reconhecerão, em seu território, as permissões nacionais e internacionais para dirigir que preencham as condições da Convenção, observadas a validade, as categorias de veículos e as idades mínimas previstas.',
  },
  {
    id: 'viena-art42', fonteId: 'decreto-86714-1981', referencia: 'Art. 42', pagina: 19,
    texto: 'A Parte Contratante pode retirar do condutor o direito de usar em seu território a permissão nacional ou internacional quando ele comete infração que autorize a retirada. A autoridade pode reter a permissão e comunicar a medida à autoridade expedidora.',
  },
];

const PARADAS = new Set(['a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'no', 'nos', 'o', 'os', 'para', 'por', 'que', 'um', 'uma']);

function termos(texto: string): string[] {
  return normalizarBusca(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((termo) => termo.length > 1 && !PARADAS.has(termo));
}

/** Recuperação lexical local e determinística; não inventa conteúdo ausente das fontes. */
export function buscarTrechosEstrangeiros(consulta: string, limite = 4): TrechoFonteEstrangeiros[] {
  const consultaNormalizada = normalizarBusca(consulta);
  const termosConsulta = termos(consulta);
  const artigo = /\bart(?:igo)?\s*\.?\s*(\d+)/i.exec(consultaNormalizada)?.[1];

  return TRECHOS.map((trecho) => {
    const fonte = FONTES_ESTRANGEIROS.find((item) => item.id === trecho.fonteId)!;
    const conteudo = normalizarBusca(`${trecho.referencia} ${trecho.texto}`);
    const cobertura = termosConsulta.filter((termo) => conteudo.includes(termo)).length;
    const referenciaExata = artigo && new RegExp(`\\bart\\.?\\s*${artigo}\\b`, 'i').test(normalizarBusca(trecho.referencia));
    const score = (referenciaExata ? 100 : 0) + cobertura * 10 + (conteudo.includes(consultaNormalizada) ? 20 : 0);
    return { ...trecho, titulo: fonte.titulo, arquivo: fonte.arquivo, urlOficial: fonte.urlOficial, score };
  })
    .filter((trecho) => trecho.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limite);
}
