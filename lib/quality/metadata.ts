import { z } from 'zod';

function dataIsoReal(valor: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

const DataVigencia = z.string().refine(dataIsoReal, 'Informe uma data de vigência válida no formato AAAA-MM-DD.');
const DataConferencia = z.string().refine(dataIsoReal, 'Informe uma data de conferência válida no formato AAAA-MM-DD.');

export const DocumentoMetadataSchema = z.object({
  fonteOficial: z.string().trim().min(1, 'Informe a fonte oficial.'),
  versao: z.string().trim().min(1, 'Informe a versão do documento.'),
  vigenteDesde: DataVigencia,
  conferidoEm: DataConferencia,
  situacao: z.enum(['vigente', 'revisar', 'substituido']).default('vigente'),
}).superRefine((metadata, contexto) => {
  if (!dataIsoReal(metadata.vigenteDesde) || !dataIsoReal(metadata.conferidoEm)) return;
  if (metadata.conferidoEm < metadata.vigenteDesde) {
    contexto.addIssue({
      code: 'custom',
      path: ['conferidoEm'],
      message: 'A data de conferência não pode ser anterior à vigência.',
    });
  }
  const hoje = new Date().toISOString().slice(0, 10);
  if (metadata.conferidoEm > hoje) {
    contexto.addIssue({
      code: 'custom',
      path: ['conferidoEm'],
      message: 'A data de conferência não pode ser futura.',
    });
  }
});

export type DocumentoMetadata = z.infer<typeof DocumentoMetadataSchema>;
