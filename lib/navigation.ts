import type { NomeIcone } from '@/components/ui/Icone';
export interface Destino { href:string;label:string;curto:string;descricao:string;icone:NomeIcone;grupo?:'Fiscalização'|'Estudo'|'Documentos';pilar?:'fiscalizacao'|'pesos'|'estrangeiros'|'procedimentos'|'utilitarios';operacional?:string }
/** Canonical routes, labels and metadata for every navigation surface. */
export const DESTINOS:Destino[]=[
 {href:'/',label:'Consultar CTB',curto:'Consultar',descricao:'Infrações e artigos',icone:'busca',pilar:'fiscalizacao',operacional:'Consulta CTB e MBFT'},
 {href:'/pop',label:'Consultar POPs',curto:'POPs',descricao:'Procedimentos operacionais',icone:'escudo',pilar:'procedimentos',operacional:'POPs PMSC'},
 {href:'/favoritos',label:'Favoritos',curto:'Salvos',descricao:'Enquadramentos salvos neste aparelho',icone:'estrela'},
 {href:'/ferramentas',label:'Ferramentas',curto:'Ferramentas',descricao:'Todos os recursos do aplicativo',icone:'engrenagem'},
 {href:'/estrangeiros',label:'Estrangeiros',curto:'Estrangeiros',descricao:'Condutores e veículos estrangeiros',icone:'globo',grupo:'Fiscalização',pilar:'estrangeiros',operacional:'Checklist e regras internacionais'},
 {href:'/pesos-dimensoes',label:'Pesos e dimensões',curto:'Pesos',descricao:'Limites e excesso de peso',icone:'balanca',grupo:'Fiscalização',pilar:'pesos'},
 {href:'/fatos-pmsc',label:'Lista de Fatos PMSC',curto:'Fatos comunicantes',descricao:'Naturezas e potencial ofensivo',icone:'arquivo',grupo:'Fiscalização',pilar:'fiscalizacao',operacional:'Fatos PMSC'},
 {href:'/casos',label:'Casos práticos',curto:'Casos',descricao:'Situações de fiscalização e procedimentos',icone:'check',grupo:'Fiscalização',pilar:'procedimentos'},
 {href:'/professor',label:'Explicar situações',curto:'Professor',descricao:'Professor Emérito: explicações e comparações',icone:'professor',grupo:'Estudo',pilar:'utilitarios',operacional:'Professor CTB'},
 {href:'/apostila',label:'Gerar apostila',curto:'Apostila',descricao:'Material de estudo a partir do acervo',icone:'livro',grupo:'Estudo',pilar:'utilitarios'},
 {href:'/offline',label:'Consulta offline',curto:'Offline',descricao:'Baixar e consultar acervo neste aparelho',icone:'livro',grupo:'Documentos',pilar:'utilitarios'},
 {href:'/atualizacoes',label:'Versões do acervo',curto:'Versões',descricao:'Diferenças textuais entre pacotes baixados',icone:'arquivo',grupo:'Documentos',pilar:'utilitarios'},
 {href:'/gerador-pdf',label:'Gerar PDF',curto:'PDF',descricao:'Criar documentos para consulta e impressão',icone:'arquivo',grupo:'Documentos',pilar:'utilitarios'},
 {href:'/comprimir-pdf',label:'Comprimir PDF',curto:'Comprimir',descricao:'Reduzir arquivos no aparelho',icone:'comprimir',grupo:'Documentos',pilar:'utilitarios'},
];
export const destino=(href:string)=>{const d=DESTINOS.find(d=>d.href===href);if(!d)throw new Error(`Destino desconhecido: ${href}`);return d};
export const ABAS_PADRAO=['/','/pop','/favoritos'];
export const ABAS_DISPONIVEIS=['/','/pop','/favoritos','/ferramentas','/estrangeiros','/pesos-dimensoes','/fatos-pmsc'].map(destino);
export const NAVEGACAO_PRINCIPAL=ABAS_PADRAO.map(destino);
export const ABAS_ADICIONAIS=['/estrangeiros','/pesos-dimensoes','/fatos-pmsc'].map(destino);
export const GRUPOS_FERRAMENTAS=['Fiscalização','Estudo','Documentos'].map(titulo=>({titulo,itens:DESTINOS.filter(d=>d.grupo===titulo)}));
export function validarAbas(x:unknown):x is string[]{return Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(h=>typeof h==='string'&&ABAS_DISPONIVEIS.some(d=>d.href===h))}
export function ordenarAbas(prioridade:string[]){const preferidas=validarAbas(prioridade)?prioridade:ABAS_PADRAO;return [...preferidas.map(destino),...ABAS_DISPONIVEIS.filter(d=>!preferidas.includes(d.href))]}
export function destinoAtivo(href:string,pathname:string):boolean{if(href==='/')return pathname==='/'||pathname==='/consulta'||pathname.startsWith('/consulta/');return pathname===href||pathname.startsWith(`${href}/`)}
export function ferramentaAtiva(pathname:string):boolean{return GRUPOS_FERRAMENTAS.some(({itens})=>itens.some(({href})=>destinoAtivo(href,pathname)))}
export function abaAtiva(href:string,pathname:string):boolean{return href==='/ferramentas'?pathname==='/ferramentas'||(ferramentaAtiva(pathname)&&!ABAS_DISPONIVEIS.some(d=>d.href!=='/ferramentas'&&destinoAtivo(d.href,pathname))):destinoAtivo(href,pathname)}
