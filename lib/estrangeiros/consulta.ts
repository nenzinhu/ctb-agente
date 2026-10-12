import { normalizarBusca } from '@/lib/search/sinonimos';
import type { FatosEstrangeiros } from './types';

const PAISES: Array<[RegExp, string]> = [
  [/\b(?:arg|argent|argentina|argentino)\w*\b/, 'AR'],
  [/\b(?:uru|urug|uruguai|uruguaio)\w*\b/, 'UY'],
  [/\b(?:parag|paraguai|paraguaio)\w*\b/, 'PY'],
  [/\b(?:chil|chile|chileno)\w*\b/, 'CL'],
  [/\b(?:boliv|bolivia|boliviano)\w*\b/, 'BO'],
  [/\b(?:peru|peruano)\w*\b/, 'PE'],
];

/** Interpreta somente fatos descritivos. Identificadores legais nunca recebem fuzzy matching. */
export function interpretarConsultaEstrangeiros(texto: string): Partial<FatosEstrangeiros> {
  const consulta = normalizarBusca(texto).replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!consulta || /\b\d{3}-?\d{2}\b/.test(consulta) || /\bart(?:igo)?\s*\d+/i.test(consulta)) return {};

  const fatos: Partial<FatosEstrangeiros> = {};
  const pais = PAISES.find(([padrao]) => padrao.test(consulta));
  if (pais) fatos.paisHabilitacao = pais[1];

  if (/\b(?:venc|vencid|expir)\w*\b/.test(consulta)) fatos.habilitacao = 'vencida';
  else if (/\b(?:sem|nao)\s+(?:carteira|habilit|cnh|document)\w*/.test(consulta)) fatos.habilitacao = 'nao_apresentada';
  else if (/\b(?:habilit|carteira|document)\w*\s+(?:valid|regular)\w*/.test(consulta)) fatos.habilitacao = 'valida';

  if (/\bpid\b/.test(consulta)) fatos.pidApresentada = true;
  if (/\b(?:carro|veiculo|caminhao|moto)\s+(?:estrang|paragu|argent|urug)\w*/.test(consulta)) fatos.registroVeiculo = 'estrangeiro';
  if (/\bsem\s+(?:seguro|carta verde)\b/.test(consulta)) fatos.seguroApresentado = false;
  if (/\bresident\w*\b/.test(consulta)) fatos.visitanteOuResidente = 'residente';
  if (/\b(?:turist|visitant)\w*\b/.test(consulta)) fatos.visitanteOuResidente = 'visitante';
  return fatos;
}
