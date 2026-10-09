import configuracoes from '@/data/pesos-dimensoes/configuracoes.json';
import type { ConfiguracaoVeiculo } from './types';

const CATALOGO = configuracoes as ConfiguracaoVeiculo[];

export function listarConfiguracoes(): ConfiguracaoVeiculo[] {
  return CATALOGO.map((item) => ({
    ...item,
    apelidos: [...item.apelidos],
    gruposEixo: item.gruposEixo.map((grupo) => ({ ...grupo })),
    fontes: item.fontes.map((fonte) => ({ ...fonte })),
  }));
}

export function obterConfiguracao(id: string): ConfiguracaoVeiculo | null {
  return listarConfiguracoes().find((item) => item.id === id) ?? null;
}
