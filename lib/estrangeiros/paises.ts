import { normalizarBusca } from '@/lib/search/sinonimos';

export type InstrumentoInternacional = 'A' | 'R' | 'V';

export interface AcordosPais {
  pais: string;
  instrumentos: InstrumentoInternacional[];
  pagina: number;
  valorFormulario: string;
  aliases: string[];
}

const DADOS = `
África do Sul|V|1
Albânia|V|1
Alemanha|V|1|DE|alemao,alema
Anguilla|R|1
Angola|R|1
Arábia Saudita|V|1
Argélia|R|1
Argentina|A|1|AR|argentino,argentina,arg
Arquipélago de San Andrés|R|1||arquem de sem andres,san andres
Armênia|V|1
Austrália|R|1
Áustria|V|1
Azerbaijão|V|1||azerbaidjao
Bahamas|V|2
Bahrein|V|2||barem,bareine,bairein
Bélgica|V|2
Bermudas|R|2
Bielorrússia|V|2||bielo-russia,belarus
Bolívia|A|2|BO|boliviano,boliviana
Bósnia e Herzegovina|V|2||bosnia-herzegovina
Bulgária|V|2
Cabo Verde|R|2
Canadá|R|2
Catar|V|2
Cazaquistão|V|2
Ilhas Cayman|R|2||cayman
Ceuta e Melilla|R|2
Chile|A|2|CL|chileno,chilena
Singapura|R|2||cingapura
Colômbia|R|2
Congo|V|2
Coreia do Sul|R|2
Costa do Marfim|V|2||cote d ivoire
Costa Rica|R|2
Croácia|V|2
Cuba|V|2
Dinamarca|V|2
El Salvador|R|3
Emirados Árabes Unidos|V|3||emirados arabes,eau
Equador|R|3
Escócia|R|3
Eslovênia|V|3
Espanha|R|3|ES|espanhol,espanhola
Estados Unidos|R|3|US|americano,americana,eua
Estônia|V|3
Filipinas|V|3
Finlândia|V|3
França|V|3|FR|frances,francesa
Gabão|R|3
Gana|R|3
Geórgia|V|3
Gibraltar|R|3
Grã-Bretanha|R|3||gra bretanha
Grécia|R,V|3
Groenlândia|V|3
Guadalupe|V|3
Guatemala|R|3
Guiana|V|3
Guiana Francesa|V|3
Guiné-Bissau|R|3||guine bissau
Haiti|R|3
Países Baixos|R,V|4||holanda,holandes,holandesa
Honduras|R|4
Hungria|V|4
Ilha de Pitcairn|R|4||pitcairn
Ilha Norfolk|R|4
Ilhas Aland|V|4
Ilhas Cocos|R|4||ilhas cocos keeling
Ilhas Cook|R|4
Ilhas do Canal|R|4
Ilhas Geórgia e Sandwich do Sul|R|4
Ilhas Virgens Britânicas|R|4||ilhas virgens gb
Ilhas Wallis e Futuna|V|4
Indonésia|R|4
Inglaterra|R|4
Irã|V|4||ira,iran
Iraque|V|4
Irian Ocidental|V|4||iria ocidental
Irlanda do Norte|R|4
Israel|V|4
Itália|V|4|IT|italiano,italiana
Kuwait|V|4||kuaite,kuweit
Letônia|V|4
Libéria|V|5
Líbia|R|5
Lituânia|V|5
Luxemburgo|V|5
Macedônia|V|5
Ilhas Malvinas|R|5||malvinas,ilhas falkland
Marrocos|V|5
Martinica|V|5
Mayotte|V|5
México|R|5
Moçambique|R|5
Moldávia|V|5||moldova
Mônaco|V|5
Mongólia|V|5
Montenegro|V|5
Montserrat|R|5
Namíbia|R|5
Nicarágua|R|5
Níger|V|5
Niue|R|5
Noruega|V|5
Nova Caledônia|V|5
Nova Zelândia|R|5
Nueva Esparta|R|5
País de Gales|R|5
Panamá|R|5
Paquistão|V|6
Paraguai|A|6|PY|paraguaio,paraguaia
Peru|A,V|6|PE|peruano,peruana
Polinésia Francesa|V|6
Polônia|V|6
Porto Rico|V|6
Portugal|R,V|6|PT|portugues,portuguesa
Quênia|V|6
Quirguízia|V|6||quirguizia,uirguiztao
Reino Unido|R|6|GB|britanico,britanica,ingles,inglesa
República Centro-Africana|V|6||republica centroafricana
República Democrática do Congo|V|6||republica democr do congo,rd congo
República Dominicana|R|6
Eslováquia|V|6||republica eslovaca
República Checa|V|6||rep checa,republica tcheca,tchequia
Reunião|V|6
Romênia|V|6
Rússia|V|6
Saara Ocidental|V|6
Saint-Pierre e Miquelon|V|6
San Marino|V|6
Santa Helena|R|6
São Tomé e Príncipe|R|7
Seychelles|V|7||seichelles,seicheles
Senegal|V|7
Sérvia|V|7
Suécia|V|7
Suíça|V|7
Svalbard|V|7
Tajiquistão|V|7||tadjiquistao
Terras Austrais e Antártica|R|7
Território Britânico na Antártica|R|7
Território Britânico no Oceano Índico|R|7
Timor|V|7
Toquelau|R|7
Tunísia|V|7
Ilhas Turcas e Caicos|R|7||turcas e caicos,turks e caicos
Turcomenistão|V|7||turcomenia
Turquia|V|7
Ucrânia|V|7
Uruguai|A,V|7|UY|uruguaio,uruguaia
Uzbequistão|V|7
Venezuela|R|7
Vietnam|V|7||vietna,vietnã
Zimbábue|V|7||zimbabwe
`.trim();

function normalizar(valor: string): string {
  return normalizarBusca(valor).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export const PAISES_TRATADOS: AcordosPais[] = DADOS.split('\n').map((linha) => {
  const [pais, siglas, pagina, valor, aliases = ''] = linha.split('|');
  return {
    pais,
    instrumentos: siglas.split(',') as InstrumentoInternacional[],
    pagina: Number(pagina),
    valorFormulario: valor || pais,
    aliases: aliases.split(',').filter(Boolean),
  };
});

const ROTULOS: Record<InstrumentoInternacional, string> = {
  A: 'Outros tratados',
  R: 'Princípio de Reciprocidade',
  V: 'Convenção de Viena',
};

function corresponde(consulta: string, candidato: string): boolean {
  const termo = normalizar(candidato);
  if (termo.length <= 3) return consulta === termo || (termo === 'eua' && (` ${consulta} `).includes(' eua '));
  return (` ${consulta} `).includes(` ${termo} `);
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
