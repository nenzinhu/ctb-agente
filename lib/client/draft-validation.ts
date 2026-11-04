import type {FatosEstrangeiros} from '@/lib/estrangeiros/types';
/** Persisted form fields are untrusted; never coerce strings into boolean facts. */
export function validarFatosRascunho(valor:unknown):FatosEstrangeiros{
 if(!valor||typeof valor!=='object'||Array.isArray(valor))return {};
 const v=valor as Record<string,unknown>,out:Record<string,unknown>={};
 for(const k of ['paisHabilitacao','paisPlaca'])if(typeof v[k]==='string'&&(v[k] as string).length<=80)out[k]=v[k];
 for(const k of ['pidApresentada','identidadeApresentada','categoriaCompativel','seguroApresentado','admissaoTemporariaApresentada'])if(typeof v[k]==='boolean')out[k]=v[k];
 const enums:Record<string,string[]>={visitanteOuResidente:['visitante','residente'],habilitacao:['valida','vencida','nao_apresentada'],registroVeiculo:['brasileiro','estrangeiro'],finalidade:['particular','carga','passageiros']};
 for(const [k,opcoes] of Object.entries(enums))if(typeof v[k]==='string'&&opcoes.includes(v[k] as string))out[k]=v[k];
 if(typeof v.dataEntrada==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.dataEntrada)){const date=new Date(`${v.dataEntrada}T00:00:00Z`);if(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===v.dataEntrada)out.dataEntrada=v.dataEntrada;}
 return out as FatosEstrangeiros;
}
