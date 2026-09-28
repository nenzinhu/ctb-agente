import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import FichaFiscalizacao from '@/components/FichaFiscalizacao';
import type { FichaMbft } from '@/lib/mbft/parser';
import type { CartaoEstruturado } from '@/lib/response/response-types';

const fichas = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as FichaMbft[];
const ficha = (codigo: string) => fichas.find((f) => f.codigo === codigo)!;
const card = { consulta: 'x', normas_relacionadas: [], concurso_infracoes: [], categoria_cnh_exigida: 'desconhecida', crime_transito: false } as unknown as CartaoEstruturado;

describe('extras da ficha oficial', () => {
  it('mostra o selo de crime com os artigos', () => {
    render(<FichaFiscalizacao card={card} campos={null} oficial={ficha('516-91')} />);
    expect(screen.getByText(/Também pode ser crime de trânsito/)).toBeInTheDocument();
    expect(screen.getAllByText(/Art\. 306 e 310 do CTB/).length).toBeGreaterThan(0);
  });

  it('não mostra o selo quando não é crime', () => {
    render(<FichaFiscalizacao card={card} campos={null} oficial={ficha('518-51')} />);
    expect(screen.queryByText(/Também pode ser crime de trânsito/)).not.toBeInTheDocument();
  });

  it('explica ao cidadão e copia o texto', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<FichaFiscalizacao card={card} campos={null} oficial={ficha('763-31')} />);
    fireEvent.click(screen.getByText('Explicar ao cidadão'));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('segurando telefone celular'));
    expect(await screen.findByText('Copiado.')).toBeInTheDocument();
  });

  it('lista o histórico da lei quando existe', () => {
    const comHistorico = { ...ficha('763-31'), historicoLei: ['Incluído pela Lei nº 13.281, de 2016'] };
    render(<FichaFiscalizacao card={card} campos={null} oficial={comHistorico} />);
    expect(screen.getByText('Mudou na lei')).toBeInTheDocument();
    expect(screen.getByText('Incluído pela Lei nº 13.281, de 2016')).toBeInTheDocument();
  });
});
