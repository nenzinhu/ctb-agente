'use client';

import { requestJson, RequestError } from '@/lib/client/request';

import { useEffect, useMemo, useRef, useState } from 'react';

import Field from '@/components/ui/Field';
import Icone, { type NomeIcone } from '@/components/ui/Icone';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SectionCard from '@/components/ui/SectionCard';
import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import SeletorConfiguracao from './SeletorConfiguracao';
import ResultadoPesos, { type RespostaCalculoPesos } from './ResultadoPesos';

type Modo = 'documento' | 'balanca';
type TipoPesoDocumento = 'carga' | 'peso-bruto-total';
type Campos = Record<string, string>;

const CONFIGURACAO_INICIAL = 'truck-3-eixos';

export function converterNumeroBrasileiro(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  const agrupado = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto);
  const normalizado = agrupado ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

/** Text the PBT/PBTC field shows for a configuration, empty when only the AET defines it. */
function pbtDoDesenho(id: string): string {
  const limite = obterConfiguracao(id)?.limiteTotalKg;
  return limite === null || limite === undefined ? '' : String(limite);
}

export default function CalculadoraPesos() {
  const [configuracaoId, setConfiguracaoId] = useState(CONFIGURACAO_INICIAL);
  const [pbtTexto, setPbtTexto] = useState(() => pbtDoDesenho(CONFIGURACAO_INICIAL));
  const [modo, setModo] = useState<Modo>('documento');
  const [tipoPesoDocumento, setTipoPesoDocumento] = useState<TipoPesoDocumento>('carga');
  const [campos, setCampos] = useState<Campos>({});
  const [resultado, setResultado] = useState<RespostaCalculoPesos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const requisicao = useRef<AbortController | null>(null);
  useEffect(() => () => { requisicao.current?.abort(); }, []);
  const configuracao = useMemo(() => obterConfiguracao(configuracaoId)!, [configuracaoId]);

  const cancelarCalculo = () => {
    requisicao.current?.abort();
    requisicao.current = null;
    setCarregando(false);
    setResultado(null);
  };

  const alterar = (nome: string, valor: string) => {
    cancelarCalculo();
    setCampos((atual) => ({ ...atual, [nome]: valor }));
    setErro(null);
  };

  /** Drawing → PBT/PBTC: the catalog limit of the chosen configuration. */
  const escolherDesenho = (id: string) => {
    cancelarCalculo();
    setConfiguracaoId(id);
    setPbtTexto(pbtDoDesenho(id));
    setCampos({});
    setResultado(null);
    setErro(null);
  };

  /** The plate value narrows the limit, but never guesses the axle drawing. */
  const alterarPbt = (valor: string) => {
    cancelarCalculo();
    setPbtTexto(valor);
    setResultado(null);
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
    if (modo === 'balanca' && configuracao.gruposEixo.some((grupo) => grupo.limiteKg === null)) {
      setErro('A fiscalização por balança exige os limites por grupo de eixo individualizados na AET. Use uma configuração catalogada ou confira a autorização antes de calcular.');
      return;
    }
    const pbt = converterNumeroBrasileiro(pbtTexto);
    const taraNecessaria = modo === 'documento' && tipoPesoDocumento === 'carga';
    const obrigatorios: Array<[string, string]> = [
      ...(pbt === null ? [['pbt', 'PBT/PBTC do conjunto'] as [string, string]] : []),
      ...(configuracao.unidades > 1 ? [['cmt', 'CMT da unidade tratora'] as [string, string]] : []),
      ...(configuracao.requerAet ? [['aet', 'limite autorizado na AET'] as [string, string]] : []),
      ...(taraNecessaria ? [['tara', 'tara do veículo'] as [string, string]] : []),
      ...(modo === 'documento'
        ? tipoPesoDocumento === 'carga'
          ? [['cargaNota', 'peso da carga na nota'] as [string, string]]
          : [['pbtDocumento', 'peso bruto total no documento'] as [string, string]]
        : [['pesoBalanca', 'peso total aferido'] as [string, string]]),
      ...(modo === 'balanca'
        ? configuracao.gruposEixo
            .filter((grupo) => grupo.limiteKg !== null)
            .map((grupo) => [`eixo-${grupo.id}`, grupo.nome] as [string, string])
        : []),
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
        pbtTecnicoKg: pbt ?? undefined,
        taraKg: taraNecessaria ? valor('tara') ?? undefined : undefined,
        cmtKg: configuracao.unidades > 1 ? valor('cmt') ?? undefined : undefined,
        limiteAetKg: configuracao.requerAet ? valor('aet') ?? undefined : undefined,
      },
      fiscalizacao: {
        modo,
        tipoPesoDocumento: modo === 'documento' ? tipoPesoDocumento : undefined,
        pesoCargaDocumentoKg: modo === 'documento' && tipoPesoDocumento === 'carga' ? valor('cargaNota')! : undefined,
        pesoBrutoTotalDocumentoKg: modo === 'documento' && tipoPesoDocumento === 'peso-bruto-total' ? valor('pbtDocumento')! : undefined,
        pesoTotalAferidoKg: modo === 'balanca' ? valor('pesoBalanca')! : undefined,
        gruposEixo,
      },
    };

    if (requisicao.current && !requisicao.current.signal.aborted) requisicao.current.abort();
    const controller = new AbortController();
    requisicao.current = controller;
    setCarregando(true);
    setResultado(null);
    setErro(null);
    try {
      const body = await requestJson<RespostaCalculoPesos>('/api/pesos-dimensoes/consultar', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (controller.signal.aborted || requisicao.current !== controller) return;
      setResultado(body);
    } catch (falha) {
      if (controller.signal.aborted || requisicao.current !== controller || (falha instanceof RequestError && falha.kind === 'aborted')) return;
      setErro(falha instanceof Error ? falha.message : 'Não foi possível realizar o cálculo.');
      setResultado(null);
    } finally {
      if (!controller.signal.aborted && requisicao.current === controller) setCarregando(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={calcular} className="space-y-5">
        <SectionCard numero={1} titulo="Configuração do veículo">
          <SeletorConfiguracao valor={configuracaoId} onChange={escolherDesenho} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="PBT/PBTC do conjunto (kg)"
              value={pbtTexto}
              onChange={(evento) => alterarPbt(evento.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex: 23.000"
              hint={
                configuracao.limiteTotalKg === null
                  ? 'Esta configuração só tem limite na AET: informe aqui o PBT/PBTC autorizado.'
                  : 'O desenho sugere o limite de catálogo. Confira e transcreva o PBT/PBTC da plaqueta ou do CRLV; o desenho não muda sozinho.'
              }
            />
            {configuracao.unidades > 1 && campo('cmt', 'CMT da unidade tratora (kg)', 'Transcreva a capacidade máxima de tração indicada na plaqueta ou no CRLV.')}
            {configuracao.requerAet && campo('aet', 'Limite autorizado na AET (kg)', 'Transcreva o PBTC exatamente como consta na autorização.')}
          </div>
          <p className="mt-3 text-xs text-ds-subtle">
            {configuracao.limiteTotalKg === null
              ? 'Limite legal de catálogo: conforme AET. '
              : `Limite legal de catálogo: ${configuracao.limiteTotalKg.toLocaleString('pt-BR')} kg. `}
            O cálculo adota sempre o menor limite entre o legal, o informado e o autorizado.
          </p>
        </SectionCard>

        <SectionCard numero={2} titulo="Forma de fiscalização">
          <fieldset>
            <legend className="label">Como o peso foi verificado?</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['documento', 'Nota fiscal', 'arquivo'], ['balanca', 'Balança', 'balanca']] as const).map(([id, label, icone]) => (
                <label key={id} className={`flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-control border-2 px-3 font-semibold ${modo === id ? 'border-ds-primary bg-ds-primary-soft text-ds-primary-strong' : 'border-ds-border bg-ds-surface'}`}>
                  <input type="radio" name="modo" value={id} checked={modo === id} onChange={() => { cancelarCalculo(); setModo(id); setResultado(null); }} className="sr-only" />
                  <Icone nome={icone as NomeIcone} tamanho={24} aria-label={`Fiscalização por ${label.toLocaleLowerCase('pt-BR')}`} />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-control border border-ds-line bg-ds-muted p-3 text-xs leading-relaxed text-ds-subtle">
              Tolerância aplicada automaticamente: <strong className="text-ds-text">5% no peso total</strong> e <strong className="text-ds-text">12,5% por grupo de eixo</strong>, quando houver aferição individualizada.
            </p>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {modo === 'documento' ? (
              <>
                <fieldset className="sm:col-span-2">
                  <legend className="label">Qual peso consta no documento?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([['carga', 'Carga declarada (tara + carga)'], ['peso-bruto-total', 'Peso bruto total declarado']] as const).map(([id, label]) => (
                      <label key={id} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-center text-sm font-semibold ${tipoPesoDocumento === id ? 'border-ds-primary bg-ds-primary-soft text-ds-primary-strong' : 'border-ds-border bg-ds-surface'}`}>
                        <input type="radio" name="tipoPesoDocumento" value={id} checked={tipoPesoDocumento === id} onChange={() => { cancelarCalculo(); setTipoPesoDocumento(id); setResultado(null); }} className="sr-only" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {tipoPesoDocumento === 'carga' ? (
                  <>
                    {campo('tara', 'Tara do veículo (kg)', 'Só para somar à carga: use a tara da plaqueta ou do CRLV.')}
                    {campo('cargaNota', 'Peso da carga na nota (kg)', 'O sistema somará este valor à tara. Não há tolerância por documento.')}
                  </>
                ) : (
                  campo('pbtDocumento', 'Peso bruto total no documento (kg)', 'Informe o total exatamente como declarado; a tara não será somada novamente.')
                )}
                {tipoPesoDocumento === 'peso-bruto-total' && (
                  <p className="rounded-control border border-ds-warn bg-ds-accent/10 p-3 text-xs sm:col-span-2">
                    Para autuação, confirme se o documento também declara o peso da carga em quilogramas, conforme o art. 49, §§ 3º a 5º, da Resolução CONTRAN nº 882/2021.
                  </p>
                )}
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

        {erro && <p role="alert" className="rounded-control border border-ds-danger bg-ds-danger/5 p-3 text-sm text-ds-danger">{erro} <a className="underline" href="/consulta?q=excesso%20peso">Consultar as fichas de excesso de peso no MBFT</a></p>}
        <PrimaryButton type="submit" icone="balanca" carregando={carregando} textoCarregando="Calculando…" className="min-h-12 w-full">
          {erro ? 'Tentar novamente' : 'Calcular fiscalização'}
        </PrimaryButton>
      </form>
      {resultado && <ResultadoPesos resultado={resultado} />}
    </div>
  );
}
