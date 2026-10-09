'use client';

import { useMemo, useState } from 'react';

import Field from '@/components/ui/Field';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SectionCard from '@/components/ui/SectionCard';
import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import SeletorConfiguracao from './SeletorConfiguracao';
import ResultadoPesos, { type RespostaCalculoPesos } from './ResultadoPesos';

type Modo = 'documento' | 'balanca';
type Campos = Record<string, string>;

export function converterNumeroBrasileiro(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  const agrupado = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto);
  const normalizado = agrupado ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export default function CalculadoraPesos() {
  const [configuracaoId, setConfiguracaoId] = useState('truck-3-eixos');
  const [modo, setModo] = useState<Modo>('documento');
  const [campos, setCampos] = useState<Campos>({});
  const [resultado, setResultado] = useState<RespostaCalculoPesos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const configuracao = useMemo(() => obterConfiguracao(configuracaoId)!, [configuracaoId]);

  const alterar = (nome: string, valor: string) => {
    setCampos((atual) => ({ ...atual, [nome]: valor }));
    setErro(null);
  };

  const valor = (nome: string) => converterNumeroBrasileiro(campos[nome] ?? '');
  const campo = (nome: string, label: string, hint?: string) => (
    <Field
      label={label}
      value={campos[nome] ?? ''}
      onChange={(evento) => alterar(nome, evento.target.value)}
      inputMode="decimal"
      autoComplete="off"
      placeholder="Ex: 23.000"
      hint={hint}
    />
  );

  const calcular = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (carregando) return;
    const obrigatorios = [
      ['tara', 'tara do conjunto'],
      ['pbtTecnico', 'PBT/PBTC técnico'],
      ['comprimento', 'comprimento total'],
      ...(configuracao.unidades > 1 ? [['cmt', 'CMT da unidade tratora']] : []),
      ...(configuracao.requerAet ? [['aet', 'limite autorizado na AET']] : []),
      ...(modo === 'documento' ? [['cargaNota', 'peso da carga na nota']] : [['pesoBalanca', 'peso total aferido']]),
      ...(modo === 'balanca' ? configuracao.gruposEixo.filter((grupo) => grupo.limiteKg !== null).map((grupo) => [`eixo-${grupo.id}`, grupo.nome]) : []),
    ];
    const ausentes = obrigatorios.filter(([nome]) => valor(nome) === null).map(([, label]) => label);
    if (ausentes.length > 0) {
      setErro(`Revise os campos: ${ausentes.join(', ')}. Use números em kg; ponto pode separar milhares e vírgula, decimais.`);
      return;
    }

    const gruposEixo = modo === 'balanca' ? configuracao.gruposEixo.filter((grupo) => grupo.limiteKg !== null).map((grupo) => ({
      id: grupo.id,
      nome: grupo.nome,
      pesoKg: valor(`eixo-${grupo.id}`)!,
      limiteLegalKg: grupo.limiteKg!,
    })) : undefined;
    const payload = {
      configuracaoId,
      limite: {
        taraKg: valor('tara')!,
        comprimentoM: valor('comprimento')!,
        pbtTecnicoKg: valor('pbtTecnico')!,
        cmtKg: configuracao.unidades > 1 ? valor('cmt')! : undefined,
        limiteSinalizadoKg: valor('sinalizacao') ?? undefined,
        limiteAetKg: configuracao.requerAet ? valor('aet')! : undefined,
      },
      fiscalizacao: {
        modo,
        pesoCargaDocumentoKg: modo === 'documento' ? valor('cargaNota')! : undefined,
        pesoTotalAferidoKg: modo === 'balanca' ? valor('pesoBalanca')! : undefined,
        gruposEixo,
        quantidadeEmbarcadores: valor('embarcadores') ?? undefined,
      },
    };

    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch('/api/pesos-dimensoes/consultar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Não foi possível realizar o cálculo.');
      setResultado(body as RespostaCalculoPesos);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível realizar o cálculo.');
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={calcular} className="space-y-5">
        <SectionCard numero={1} titulo="Configuração do veículo">
          <SeletorConfiguracao valor={configuracaoId} onChange={(id) => { setConfiguracaoId(id); setCampos({}); setResultado(null); }} />
          <p className="mt-3 text-xs text-ds-subtle">Limite legal de catálogo: {configuracao.limiteTotalKg?.toLocaleString('pt-BR') ?? 'conforme AET'} kg. O cálculo adotará sempre o menor limite informado.</p>
        </SectionCard>

        <SectionCard numero={2} titulo="Dados técnicos e limite">
          <div className="grid gap-4 sm:grid-cols-2">
            {campo('tara', 'Tara do conjunto (kg)', 'Use a tara inscrita/confirmada, sem a carga.')}
            {campo('pbtTecnico', 'PBT/PBTC técnico (kg)', 'Confira CRLV, plaqueta ou ficha técnica.')}
            {campo('comprimento', 'Comprimento total (m)', 'Informe em metros; exemplo: 18,6.')}
            {configuracao.unidades > 1 && campo('cmt', 'CMT da unidade tratora (kg)')}
            {campo('sinalizacao', 'Limite sinalizado na via (kg)', 'Opcional. Placa R-14 prevalece quando menor.')}
            {configuracao.requerAet && campo('aet', 'Limite autorizado na AET (kg)')}
          </div>
        </SectionCard>

        <SectionCard numero={3} titulo="Forma de fiscalização">
          <fieldset>
            <legend className="label">Como o peso foi verificado?</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['documento', 'Nota fiscal'], ['balanca', 'Balança']] as const).map(([id, label]) => (
                <label key={id} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-control border-2 px-3 font-semibold ${modo === id ? 'border-ds-primary bg-ds-primary-soft text-ds-primary-strong' : 'border-ds-border bg-ds-surface'}`}>
                  <input type="radio" name="modo" value={id} checked={modo === id} onChange={() => { setModo(id); setResultado(null); }} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {modo === 'documento' ? (
              <>
                {campo('cargaNota', 'Peso da carga na nota (kg)', 'Não há tolerância na fiscalização por documento.')}
                {campo('embarcadores', 'Quantidade de embarcadores', 'Opcional; ajuda a indicar o responsável provável.')}
              </>
            ) : (
              <>
                {campo('pesoBalanca', 'Peso total aferido (kg)', 'A tolerância de 5% será aplicada pelo sistema.')}
                {configuracao.gruposEixo.filter((grupo) => grupo.limiteKg !== null).map((grupo) => (
                  <div key={grupo.id}>{campo(`eixo-${grupo.id}`, `${grupo.nome} — peso aferido (kg)`, `Limite-base do grupo: ${grupo.limiteKg!.toLocaleString('pt-BR')} kg.`)}</div>
                ))}
              </>
            )}
          </div>
        </SectionCard>

        {erro && <p role="alert" className="rounded-control border border-ds-danger bg-ds-danger/5 p-3 text-sm text-ds-danger">{erro}</p>}
        <PrimaryButton type="submit" icone="balanca" carregando={carregando} textoCarregando="Calculando…" className="min-h-12 w-full">
          Calcular fiscalização
        </PrimaryButton>
      </form>
      {resultado && <ResultadoPesos resultado={resultado} />}
    </div>
  );
}
