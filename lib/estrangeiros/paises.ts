import { normalizarBusca } from '@/lib/search/sinonimos';

export type InstrumentoInternacional = 'A' | 'R' | 'V';

export interface AcordosPais {
  pais: string;
  instrumentos: InstrumentoInternacional[];
  valorFormulario: string;
  aliases: string[];
}

const DADOS = `
África do Sul|V
Albânia|V
Alemanha|V|DE|alemao,alema
Angola|R
Argélia|R
Argentina|A,V|AR|argentino,argentina,arg
Austrália|R
Áustria|V
Azerbaijão|V
Bahamas|V
Bahrein|V
Bielorrússia|V
Bélgica|V
Bolívia|A,V|BO|boliviano,boliviana
Bósnia e Herzegovina|V
Brasil|A,R|BR|brasileiro,brasileira
Bulgária|V
Canadá|R
Cabo Verde|R
Cazaquistão|V
Chile|A,V|CL|chileno,chilena
Colômbia|R
Coreia do Sul|R
Costa do Marfim|V
Costa Rica|R
Croácia|V
Cuba|V
Dinamarca|V
El Salvador|R
Equador|R
Eslováquia|V
Eslovênia|V
Espanha|R|ES|espanhol,espanhola
Estados Unidos|R|US|americano,americana,eua
Estônia|V
Filipinas|V
Finlândia|V
França|V|FR|frances,francesa
Gabão|R
Gana|R
Geórgia|V
Grécia|R
Guatemala|R
Guiana|V
Guiné-Bissau|R||guine bissau
Haiti|R
Honduras|R
Hong Kong|R
Hungria|V
Indonésia|R
Irã|V
Israel|V
Itália|V|IT|italiano,italiana
Kuwait|V
Letônia|V
Líbia|R
Lituânia|V
Luxemburgo|V
Macau|R
Macedônia|V
Marrocos|V
México|R
Moldávia|V
Mônaco|V
Mongólia|V
Montenegro|V
Namíbia|R
Nicarágua|R
Níger|V
Noruega|V
Nova Zelândia|R
Países Baixos|R||holanda,holandes,holandesa
Panamá|R
Paquistão|V
Paraguai|A,V|PY|paraguaio,paraguaia
Peru|A,V|PE|peruano,peruana
Polônia|V
Portugal|R|PT|portugues,portuguesa
Reino Unido|R|GB|britanico,britanica,ingles,inglesa
República Centro-Africana|V
República Checa|V||rep checa,republica tcheca,tchequia
República Democrática do Congo|V||republica democr do congo,rd congo
República Dominicana|R
Romênia|V
Rússia|V
San Marino|V
São Tomé e Príncipe|R
Senegal|V
Sérvia|V
Seychelles|V
Singapura|R
Suécia|V
Suíça|V
Tajiquistão|V
Tunísia|V
Turcomenistão|V
Ucrânia|V
Uruguai|A,V|UY|uruguaio,uruguaia
Uzbequistão|V
Venezuela|R
Zimbabwe|V||zimbabue
`.trim();

function normalizar(valor: string): string {
  return normalizarBusca(valor).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export const PAISES_TRATADOS: AcordosPais[] = DADOS.split('\n').map((linha) => {
  const [pais, siglas, valor, aliases = ''] = linha.split('|');
  return {
    pais,
    instrumentos: siglas.split(',') as InstrumentoInternacional[],
    valorFormulario: valor || pais,
    aliases: aliases.split(',').filter(Boolean),
  };
});

const ROTULOS: Record<InstrumentoInternacional, string> = {
  A: 'Acordo RBUT',
  R: 'Princípio de Reciprocidade',
  V: 'Convenção de Viena',
};

function corresponde(consulta: string, candidato: string): boolean {
  const termo = normalizar(candidato);
  return termo.length > 1 && (` ${consulta} `).includes(` ${termo} `);
}

/** Localiza país ou nacionalidade sem aceitar aproximações ambíguas. */
export function buscarAcordosPais(texto: string): AcordosPais | null {
  const consulta = normalizar(texto);
  if (!consulta) return null;

  return PAISES_TRATADOS
    .map((item) => ({
      item,
      chaves: [item.pais, ...item.aliases].filter(Boolean),
      codigo: item.valorFormulario !== item.pais ? normalizar(item.valorFormulario) : null,
    }))
    .sort((a, b) => Math.max(...b.chaves.map((chave) => normalizar(chave).length)) - Math.max(...a.chaves.map((chave) => normalizar(chave).length)))
    .find(({ chaves, codigo }) => (codigo !== null && consulta === codigo) || chaves.some((chave) => corresponde(consulta, chave)))?.item ?? null;
}

export function descreverAcordosPais(texto: string): string | null {
  const resultado = buscarAcordosPais(texto);
  if (!resultado) return null;
  return `${resultado.pais}: ${resultado.instrumentos.map((sigla) => ROTULOS[sigla]).join(' e ')}.`;
}

export function nomeInstrumento(sigla: InstrumentoInternacional): string {
  return ROTULOS[sigla];
}
