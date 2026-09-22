// Thematic dossiê generation with @react-pdf/renderer.
// This file contains JSX, so it must stay a .tsx module.
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Enquadramento, Jurisprudencia } from '@/lib/db/schema';
import type { NormaAplicavel } from '@/lib/response/response-types';
import { formatarMulta, labelDocumento, labelResponsavel } from '@/lib/response/format';
import type { ProjetoDeLei } from './projetos-de-lei';
import type { PDFTheme, SecoesDossie } from './themes';

const Aviso = {
  material: 'Material de apoio produzido automaticamente pelo CTB Agente. Consulte sempre as fontes oficiais.',
  proposta: 'PROPOSTA — não é lei vigente',
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
    fontSize: 10.5,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  cover: {
    paddingTop: 180,
    textAlign: 'center',
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#1a5f3f',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#444',
    marginBottom: 24,
  },
  coverMeta: {
    fontSize: 10,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#1a5f3f',
    marginTop: 18,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d5d5d5',
    paddingBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#dcdcdc',
    borderLeftWidth: 4,
    borderLeftColor: '#1a5f3f',
    padding: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  label: {
    fontSize: 8,
    color: '#666',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  listItem: {
    marginBottom: 3,
  },
  alerte: {
    backgroundColor: '#fdf6e3',
    borderLeftWidth: 3,
    borderLeftColor: '#b7791f',
    padding: 8,
    marginBottom: 8,
  },
  proposta: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#b7791f',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#777',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 6,
    textAlign: 'center',
  },
});

export interface DossieInput {
  theme: PDFTheme;
  secoes: SecoesDossie;
  normas: NormaAplicavel[];
  enquadramentos: Enquadramento[];
  jurisprudencia: Jurisprudencia[];
  projetosDeLei: ProjetoDeLei[];
  procedimento: string[];
  exemplos: { titulo: string; texto: string }[];
  versaoBase: string;
}

/**
 * Full dossiê document: cover, norms, enforcement cards, procedure, examples,
 * jurisprudence, pending bills and footer.
 */
export function DossiePDF({
  theme,
  secoes,
  normas,
  enquadramentos,
  jurisprudencia,
  projetosDeLei,
  procedimento,
  exemplos,
  versaoBase,
}: DossieInput) {
  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <Document
      title={`Dossiê ${theme.label} — CTB Agente`}
      author="CTB Agente"
      subject="Material de apoio à fiscalização de trânsito"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverTitle}>{theme.label}</Text>
          <Text style={styles.coverSubtitle}>Dossiê temático de fiscalização de trânsito</Text>
          <Text style={styles.coverMeta}>Gerado em {hoje}</Text>
          <Text style={styles.coverMeta}>Versão da base: {versaoBase}</Text>
        </View>
        <Text style={styles.footer} fixed>
          {Aviso.material}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {secoes.normas && (
          <View>
            <Text style={styles.sectionTitle}>1. Normas aplicáveis</Text>
            {normas.length === 0 ? (
              <Text style={styles.paragraph}>
                Nenhum dispositivo da base corresponde a este tema. Cadastre as normas no painel
                master para enriquecer o dossiê.
              </Text>
            ) : (
              normas.map((norma) => (
                <View key={norma.numero_dispositivo} style={styles.card}>
                  <Text style={styles.cardTitle}>{norma.numero_dispositivo}</Text>
                  <Text style={styles.paragraph}>{norma.texto}</Text>
                  <Text style={styles.label}>
                    {norma.norma_id} · {norma.vigente ? 'vigente' : 'vigência encerrada'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {secoes.enquadramentos && (
          <View>
            <Text style={styles.sectionTitle}>2. Enquadramentos</Text>
            {enquadramentos.length === 0 ? (
              <Text style={styles.paragraph}>
                Nenhum enquadramento cadastrado para os códigos deste tema.
              </Text>
            ) : (
              enquadramentos.map((enq) => (
                <View key={enq.codigo_mbft} style={styles.card} wrap={false}>
                  <Text style={styles.cardTitle}>
                    {enq.codigo_mbft} — {enq.descricao}
                  </Text>
                  <Text style={styles.paragraph}>Amparo legal: {enq.amparo_legal}</Text>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.label}>Gravidade</Text>
                      <Text style={styles.value}>{enq.gravidade}</Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Pontos</Text>
                      <Text style={styles.value}>{enq.pontos}</Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Multa</Text>
                      <Text style={styles.value}>
                        {formatarMulta(enq.valor_multa)} ({enq.unidade})
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Responsável</Text>
                      <Text style={styles.value}>{labelResponsavel(enq.responsavel)}</Text>
                    </View>
                  </View>
                  <Text style={styles.paragraph}>
                    Medidas administrativas: {enq.medida_administrativa || 'nenhuma'}
                    {enq.retem_veiculo ? ' · retenção do veículo' : ''}
                    {enq.remove_veiculo ? ' · remoção do veículo' : ''}
                    {labelDocumento(enq.recolhe_documento)
                      ? ` · recolhimento de ${labelDocumento(enq.recolhe_documento)}`
                      : ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <Text style={styles.footer} fixed>
          {Aviso.material}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {secoes.procedimento && (
          <View>
            <Text style={styles.sectionTitle}>3. Diretrizes de procedimento</Text>
            {procedimento.map((item, idx) => (
              <Text key={idx} style={styles.listItem}>
                {item}
              </Text>
            ))}
          </View>
        )}

        {secoes.exemplos && (
          <View>
            <Text style={styles.sectionTitle}>4. Exemplos do dia a dia</Text>
            <Text style={styles.label}>Conteúdo ilustrativo</Text>
            {exemplos.length === 0 ? (
              <Text style={styles.paragraph}>
                Nenhum exemplo cadastrado para este tema.
              </Text>
            ) : (
              exemplos.map((exemplo, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.cardTitle}>{exemplo.titulo}</Text>
                  <Text style={styles.paragraph}>{exemplo.texto}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {secoes.jurisprudencia && (
          <View>
            <Text style={styles.sectionTitle}>5. Jurisprudência</Text>
            {jurisprudencia.length === 0 ? (
              <Text style={styles.paragraph}>Nenhuma decisão cadastrada para este tema.</Text>
            ) : (
              jurisprudencia.map((decisao) => (
                <View key={decisao.numero} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {decisao.tipo.toUpperCase()} · {decisao.numero}
                  </Text>
                  <Text style={styles.paragraph}>{decisao.resumo || decisao.ementa}</Text>
                  {decisao.link_oficial ? (
                    <Text style={styles.label}>{decisao.link_oficial}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {secoes.projetosDeLei && (
          <View>
            <Text style={styles.sectionTitle}>6. Projetos de lei em tramitação</Text>
            {projetosDeLei.length === 0 ? (
              <Text style={styles.paragraph}>
                Nenhum projeto de lei localizado para este tema na consulta atual.
              </Text>
            ) : (
              projetosDeLei.map((pl) => (
                <View key={pl.numero} style={styles.card}>
                  <Text style={styles.proposta}>{Aviso.proposta}</Text>
                  <Text style={styles.cardTitle}>{pl.numero}</Text>
                  <Text style={styles.paragraph}>{pl.ementa}</Text>
                  <Text style={styles.label}>
                    {pl.situacao} · {pl.link}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <Text style={styles.footer} fixed>
          {Aviso.material}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Render the dossiê to a PDF buffer
 * @param input - Everything the document needs (already fetched from the database)
 * @returns PDF bytes
 */
export async function renderDossie(input: DossieInput): Promise<Buffer> {
  return renderToBuffer(<DossiePDF {...input} />);
}
