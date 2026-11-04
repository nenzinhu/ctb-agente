export type TipoOrigem='acervo'|'cadastro'|'ia'|'pendente';
const ORIGENS={
 acervo:{rotulo:'Texto do acervo documental',detalhe:'Transcrição incluída no aplicativo. Confira a redação vigente na fonte oficial.'},
 cadastro:{rotulo:'Informação cadastrada',detalhe:'Dado registrado na base; o cadastro não confirma revisão jurídica nem vigência atual.'},
 ia:{rotulo:'Texto gerado por IA',detalhe:'Explicação ou síntese gerada por modelo. Confira o documento de origem antes de atuar.'},
 pendente:{rotulo:'Revisão pendente',detalhe:'Fonte, versão ou conferência ainda precisam de revisão. Não é confirmação de vigência.'},
};
export default function OrigemTexto({tipo}:{tipo:TipoOrigem}){const o=ORIGENS[tipo];return <span className={tipo==='pendente'?'badge-media':'badge-neutral'} title={o.detalhe}>{o.rotulo}</span>}
