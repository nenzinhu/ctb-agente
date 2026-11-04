import { FONTES_ESTRANGEIROS } from '@/lib/estrangeiros/acervo';

const MODELOS = [
  { id: 'habilitacao', titulo: 'Ver modelo de habilitação', descricao: 'Habilitação estrangeira', campos: 'Confira país emissor, validade e categoria, além da correspondência entre titular e identificação.' },
  { id: 'identificacao', titulo: 'Ver modelo de identificação', descricao: 'Documento de identificação', campos: 'Confira a identificação admitida para a situação, a validade e a correspondência com a habilitação.' },
  { id: 'veiculo', titulo: 'Ver modelo de registro do veículo', descricao: 'Registro do veículo', campos: 'Confira o documento de registro e sua correspondência com o veículo apresentado, conforme o padrão do país.' },
  { id: 'seguro', titulo: 'Ver modelo de seguro internacional', descricao: 'Seguro internacional', campos: 'Confira seguradora, período, veículo e abrangência territorial. Carta Verde, RCI e outras coberturas têm regras próprias; confirme a exigência aplicável.' },
  { id: 'entrada', titulo: 'Ver modelo de comprovante de entrada', descricao: 'Comprovante de entrada', campos: 'Confira o registro admitido para comprovar a data de entrada. O formato pode ser digital ou físico, conforme a autoridade competente.' },
  { id: 'pid', titulo: 'Ver modelo de PID', descricao: 'Permissão Internacional para Dirigir', campos: 'A PID deve acompanhar a habilitação estrangeira que lhe deu origem. Confira validade e categorias; não a trate como documento autônomo.' },
];

export default function ModelosDocumentos() {
  return (
    <section className="card card-pad" aria-labelledby="modelos-documentos-titulo">
      <p className="eyebrow">Ajuda visual sob demanda</p>
      <h2 id="modelos-documentos-titulo" className="mt-1 text-xl font-bold">Modelos visuais dos documentos</h2>
      <p className="mt-2 text-sm leading-relaxed text-ds-subtle">Exemplos didáticos dos campos a conferir: não reproduzem layouts oficiais de nenhum país. O formato real e a exigência variam conforme o emissor e a situação; estes desenhos não validam autenticidade.</p>
      <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
        {MODELOS.map((modelo) => (
          <details key={modelo.id} className="min-w-0 rounded-control border border-ds-line bg-ds-surface">
            <summary className="min-h-[44px] cursor-pointer rounded-control px-4 py-3 text-sm font-semibold text-ds-primary-strong">{modelo.titulo}</summary>
            <div className="space-y-3 border-t border-ds-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ds-subtle">Modelo ilustrativo · sem valor documental</p>
              {/* Native images preserve SVG detail; closed details defer loading. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/documentos/estrangeiros/modelos/${modelo.id}.svg`} alt={`Modelo ilustrativo de ${modelo.descricao.toLowerCase()}`} width={640} height={400} loading="lazy" className="h-auto w-full rounded-lg border border-ds-line bg-white" />
              <p className="text-sm leading-relaxed text-ds-subtle">{modelo.campos}</p>
              <a href={`/documentos/estrangeiros/modelos/${modelo.id}.svg`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-ds-ink underline">Ampliar modelo em nova aba</a>
            </div>
          </details>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-ds-line pt-3">
        <span className="w-full text-xs text-ds-subtle">Base normativa do módulo — consulte a vigência e o documento aplicável:</span>
        {FONTES_ESTRANGEIROS.filter((fonte) => fonte.urlOficial).map((fonte) => (
          <a key={fonte.id} href={fonte.urlOficial} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-ds-ink underline">{fonte.id === 'resolucao-contran-933-2022' ? 'Conferir Resolução CONTRAN 933/2022' : 'Conferir Convenção de Viena'}</a>
        ))}
      </div>
    </section>
  );
}
