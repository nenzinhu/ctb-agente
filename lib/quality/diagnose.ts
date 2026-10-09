import { listDocuments } from '@/lib/ingestion/documents';
import { todasAsFichas } from '@/lib/mbft/fichas';
import { todosOsPops } from '@/lib/pop/pops';
import { executarCasos } from './benchmark';
import { carregarCasosBusca } from './cases';
import { analisarItensLocais, type MetricasIntegridade } from './integrity';
import { carregarFontesLocais } from './manifest';
import { avaliarProntidao } from './readiness';
import { obterEstatisticasDocumentais, salvarDiagnostico, type EstatisticasDocumentais } from './repository';
import { buscarParaDiagnostico } from './search-adapters';
import type { ColecaoQualidade, DiagnosticoBase, FonteDocumental, MetricasBusca } from './types';

const BUSCA_VAZIA: MetricasBusca = {
  total: 0,
  hit1: 0,
  hit3: 0,
  tempoMedioMs: 0,
  piorTempoMs: 0,
  casos: [],
};

const ESTATISTICAS_VAZIAS: EstatisticasDocumentais = {
  documentos: 0,
  trechos: 0,
  trechosSemVetor: 0,
  vazios: 0,
  curtos: 0,
  duplicados: 0,
};

function integridadeLocal(colecao: ColecaoQualidade): MetricasIntegridade {
  if (colecao === 'mbft') {
    return analisarItensLocais(todasAsFichas().map((ficha) => ({
      id: ficha.codigo,
      texto: `${ficha.tipificacaoResumida} ${ficha.tipificacao}`,
      estruturado: Boolean(ficha.codigo && ficha.tipificacaoResumida && ficha.tipificacao),
    })));
  }
  if (colecao === 'pop') {
    return analisarItensLocais(todosOsPops().map((pop) => ({
      id: pop.numero,
      texto: `${pop.titulo} ${pop.sequencia.map((item) => item.texto).join(' ')}`,
      estruturado: Boolean(pop.numero && pop.titulo && pop.sequencia.length),
    })));
  }
  return { itens: 0, vazios: 0, curtos: 0, semEstrutura: 0, duplicados: 0, invalidos: 0 };
}

async function fontesDaColecao(colecao: ColecaoQualidade): Promise<FonteDocumental[]> {
  const locais = carregarFontesLocais()
    .filter((fonte) => fonte.colecao === colecao)
    .map(({ fonteOficial, versao, vigenteDesde, conferidoEm, situacao }) => ({
      fonteOficial, versao, vigenteDesde, conferidoEm, situacao,
    }));
  if (colecao === 'mbft') return locais;
  const enviados = await listDocuments(colecao).catch(() => []);
  return [
    ...locais,
    ...enviados.map((documento) => ({
      fonteOficial: documento.fonte_oficial,
      versao: documento.versao,
      vigenteDesde: documento.vigente_desde,
      conferidoEm: documento.conferido_em,
      situacao: documento.situacao,
    })),
  ];
}

export async function executarDiagnostico(colecao: ColecaoQualidade): Promise<DiagnosticoBase> {
  const inicio = Date.now();
  const erros: string[] = [];
  const local = integridadeLocal(colecao);
  let estatisticas = ESTATISTICAS_VAZIAS;
  if (colecao !== 'mbft') {
    try {
      estatisticas = await obterEstatisticasDocumentais(colecao);
    } catch (error) {
      erros.push(`Estatísticas documentais indisponíveis: ${error instanceof Error ? error.message : 'falha desconhecida'}.`);
    }
  }

  let busca = BUSCA_VAZIA;
  try {
    busca = await executarCasos(
      carregarCasosBusca().filter((caso) => caso.colecao === colecao),
      buscarParaDiagnostico,
    );
  } catch (error) {
    erros.push(`Casos de busca indisponíveis: ${error instanceof Error ? error.message : 'falha desconhecida'}.`);
  }

  const fontes = await fontesDaColecao(colecao);
  const trechos = estatisticas.trechos + local.itens;
  const invalidos = estatisticas.vazios + estatisticas.curtos + local.invalidos + (erros.length > 0 ? 1 : 0);
  const duplicados = estatisticas.duplicados + local.duplicados;
  const vetoresAplicaveis = colecao === 'ctb' || (colecao === 'pop' && estatisticas.trechos > 0);
  const buscaSemanticaDisponivel = Boolean(process.env.MISTRAL_API_KEY);
  const prontidao = avaliarProntidao({
    fontes,
    documentos: colecao === 'mbft' ? fontes.length : estatisticas.documentos,
    itens: trechos,
    trechos,
    trechosSemVetor: estatisticas.trechosSemVetor,
    vetoresAplicaveis,
    buscaSemanticaDisponivel,
    invalidos,
    duplicados,
    busca,
  });

  const diagnostico: DiagnosticoBase = {
    colecao,
    status: prontidao.status,
    fontes,
    metricas: {
      documentos: colecao === 'mbft' ? fontes.length : estatisticas.documentos,
      itens: trechos,
      trechos,
      trechosSemVetor: estatisticas.trechosSemVetor,
      coberturaVetorial: vetoresAplicaveis && trechos > 0
        ? Number((((trechos - estatisticas.trechosSemVetor) / trechos) * 100).toFixed(2))
        : null,
      invalidos,
      duplicados,
      busca,
    },
    detalhes: {
      motivos: [...erros, ...prontidao.motivos],
      vetoresAplicaveis,
      buscaSemanticaDisponivel,
    },
    executadoEm: new Date().toISOString(),
  };
  return salvarDiagnostico(diagnostico, Date.now() - inicio);
}
