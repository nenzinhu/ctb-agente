import type { Metadata } from 'next';
import CompressorPdf from '@/components/pdf/CompressorPdf';
import Icone from '@/components/ui/Icone';

export const metadata: Metadata = {
  title: 'Comprimir PDF',
  description: 'Reduza PDFs no próprio aparelho, inclusive para uma versão somente texto ideal para indexar.',
};

export default function ComprimirPdfPage() {
  return (
    <main className="page-narrow">
      <p className="eyebrow">Ferramenta</p>
      <h1 className="page-title">Comprimir PDF</h1>
      <p className="page-lead">
        Reduza o tamanho de PDFs sem enviar nada para a internet. Na compressão máxima, fica só o texto — sem design —
        e o arquivo passa a caber em qualquer envio e a ser indexado sem problemas.
      </p>

      <div className="mt-6">
        <CompressorPdf />
      </div>

      <div className="alert-info mt-6">
        <Icone nome="info" className="mt-0.5 shrink-0 text-info" />
        <p>
          Para colocar um PDF grande na base de consulta, o master também pode escolher <strong>Máxima — PDF só com o texto</strong>{' '}
          direto no envio (Painel ou aba POP-PMSC): a conversão acontece no navegador antes do upload.
        </p>
      </div>
    </main>
  );
}
