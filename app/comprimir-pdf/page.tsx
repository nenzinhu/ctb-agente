import type { Metadata } from 'next';
import CompressorPdf from '@/components/pdf/CompressorPdf';
import Icone from '@/components/ui/Icone';
import TitleCard from '@/components/ui/TitleCard';

export const metadata: Metadata = {
  title: 'Comprimir PDF',
  description: 'Reduza PDFs no próprio aparelho, inclusive para uma versão somente texto ideal para indexar.',
};

export default function ComprimirPdfPage() {
  return (
    <main className="page-narrow space-y-6">
      <TitleCard
        titulo="Comprimir PDF"
        icone="comprimir"
        subtitulo="Reduza o tamanho de PDFs sem enviar nada para a internet. Na compressão máxima, fica só o texto — sem design — e o arquivo passa a caber em qualquer envio e a ser indexado sem problemas."
      />

      <CompressorPdf />

      <div className="alert-info">
        <Icone nome="info" className="mt-0.5 shrink-0 text-ds-ink" />
        <p>
          Para colocar um PDF grande na base de consulta, o master também pode escolher <strong>Máxima — PDF só com o texto</strong>{' '}
          direto no envio (Painel ou aba POP-PMSC): a conversão acontece no navegador antes do upload.
        </p>
      </div>
    </main>
  );
}
