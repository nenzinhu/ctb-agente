import { readFileSync } from 'node:fs';
import path from 'node:path';
import { crimeDaFicha, explicarAoCidadao, historicoDaLei } from '@/lib/mbft/ficha-extras';
import type { FichaMbft } from '@/lib/mbft/parser';

const fichas = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as FichaMbft[];
const ctb = readFileSync(path.join(process.cwd(), 'data/acervo/ctb-lei-9503-compilado.txt'), 'utf8');
const ficha = (codigo: string) => fichas.find((f) => f.codigo === codigo)!;

describe('crimeDaFicha', () => {
  it('marca exatamente as fichas que o MBFT diz que podem ser crime', () => {
    const marcadas = fichas.filter((f) => crimeDaFicha(f));
    // "SIM Art. …", and one sheet that names the article without the "SIM"
    const esperadas = fichas.filter((f) => /^(sim\b|art\.)/i.test(f.configuraCrime.trim()));
    expect(marcadas.map((f) => f.codigo)).toEqual(esperadas.map((f) => f.codigo));
    expect(marcadas.length).toBe(34);
  });

  it('traz os artigos do crime, sem o "SIM"', () => {
    expect(crimeDaFicha(ficha('516-91'))).toBe('Art. 306 e 310 do CTB');
    expect(crimeDaFicha(ficha('501-00'))).toBe('Art. 309 do CTB');
    for (const f of fichas) expect(crimeDaFicha(f) ?? 'Art.').toMatch(/^Art\./);
  });

  it('não marca infração que não é crime', () => {
    expect(crimeDaFicha(ficha('518-51'))).toBeNull();
  });
});

describe('explicarAoCidadao', () => {
  it('usa a ficha oficial e não cita prazo em dias', () => {
    const texto = explicarAoCidadao(ficha('516-91'));
    expect(texto).toContain('Dirigir sob a influência de álcool');
    expect(texto).not.toMatch(/\.\./);
    expect(texto).toContain('gravíssima');
    expect(texto).toContain('art. 165');
    expect(texto).toContain('recolhimento do documento de habilitação');
    expect(texto).toMatch(/prazo que consta na notificação/);
    expect(texto).not.toMatch(/\d+ dias/);
  });

  it('prefere o resumo claro e troca o abreviado pelo texto completo', () => {
    expect(explicarAoCidadao(ficha('763-31'))).toContain('“Dirigir veículo segurando telefone celular”');
    expect(explicarAoCidadao(ficha('772-20'))).toContain('“Quando o veículo estiver em movimento');
    expect(explicarAoCidadao(ficha('754-41'))).not.toContain('Art. 330');
  });

  it('funciona para todas as fichas sem "undefined"', () => {
    for (const f of fichas) expect(explicarAoCidadao(f)).not.toMatch(/undefined|null|\.\./);
  });
});

describe('historicoDaLei', () => {
  it('lê as leis que mexeram no dispositivo, na ordem dos anos', () => {
    expect(historicoDaLei('Art. 165.', ctb)).toEqual([
      'Redação dada pela Lei nº 11.705, de 2008',
      'Redação dada pela Lei nº 12.760, de 2012',
    ]);
  });

  it('restringe ao parágrafo quando a ficha indica', () => {
    expect(historicoDaLei('Art. 252, parágrafo único.', ctb)).toEqual(['Incluído pela Lei nº 13.281, de 2016']);
  });

  it('restringe ao inciso quando a ficha indica', () => {
    expect(historicoDaLei('Art. 252, VII.', ctb)).toEqual(['Incluído pela Lei nº 13.154, de 2015']);
  });

  it('usa o primeiro artigo em "c/c"', () => {
    expect(historicoDaLei('Art. 163 c/c 162, I.', ctb)).toEqual(historicoDaLei('Art. 163.', ctb));
  });

  it('devolve lista vazia quando não há nota, sem inventar', () => {
    expect(historicoDaLei('Art. 999.', ctb)).toEqual([]);
  });

  it('nunca quebra em nenhuma ficha', () => {
    for (const f of fichas) expect(Array.isArray(historicoDaLei(f.amparoLegal, ctb))).toBe(true);
  });
});
