import { readFileSync } from 'node:fs';
import path from 'node:path';
import { INTENCOES, condutasCirurgicas, detectarIntencoes } from '@/lib/search/intencoes';
import { expandirSinonimos } from '@/lib/search/sinonimos';

const fichas = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as Array<{
  codigo: string;
}>;
const codigos = new Set(fichas.map((f) => f.codigo));

describe('mapa de intenções (relações entre infrações)', () => {
  it('só aponta para códigos que existem no MBFT', () => {
    for (const intencao of INTENCOES) {
      for (const opcao of intencao.opcoes) expect(codigos).toContain(opcao.codigo);
    }
  });

  it('toda intenção traz um exemplo para leigo', () => {
    for (const intencao of INTENCOES) expect(intencao.exemplo.length).toBeGreaterThan(20);
  });

  it.each([
    ['bafômetro', 'alcool'],
    ['o cara tava chapado', 'alcool'],
    ['motorista de manguaça', 'alcool'],
    ['sem carteira', 'habilitacao'],
    ['pego sem cnh', 'habilitacao'],
    ['mexendo no zap dirigindo', 'celular'],
    ['racha na avenida', 'racha'],
    ['moto dando grau', 'racha'],
    ['furou o farol vermelho', 'sinal-vermelho'],
    ['carro na calçada', 'estacionamento'],
    ['vaga de idoso', 'estacionamento'],
    ['vidro fumê', 'pelicula'],
    ['sem cinto', 'cinto'],
    ['criança sem cadeirinha', 'cinto'],
    ['moto sem capacete', 'capacete'],
    ['carro sem placa', 'documentos'],
    ['licenciamento atrasado', 'documentos'],
    ['correndo demais', 'velocidade'],
  ])('"%s" → %s', (texto, id) => {
    expect(detectarIntencoes(texto).map((i) => i.id)).toContain(id);
  });

  it('não reage a um código MBFT, que já vai direto para a ficha', () => {
    expect(detectarIntencoes('516-91')).toEqual([]);
  });

  it('não sugere nada para texto sem relação', () => {
    expect(detectarIntencoes('bom dia')).toEqual([]);
  });

  it('limita a 2 intenções', () => {
    expect(detectarIntencoes('bêbado sem cnh no celular correndo sem cinto').length).toBeLessThanOrEqual(2);
  });
});

describe('gírias e siglas na busca', () => {
  it.each([
    ['furou o farol vermelho', 'semáforo'],
    ['tava no zap', 'telefone celular'],
    ['chapado', 'substância psicoativa'],
    ['vidro fumê', 'película'],
    ['empinando a moto', 'equilibrando'],
    ['parou na calçada', 'passeio'],
  ])('"%s" ganha "%s"', (texto, termo) => {
    expect(expandirSinonimos(texto)).toContain(termo);
  });

  it('"farol vermelho" não vira luz baixa', () => {
    expect(expandirSinonimos('furou o farol vermelho')).not.toContain('luz baixa');
  });
});

describe('condutasCirurgicas', () => {
  it.each([
    ['recusou o bafômetro', ['757-90']],
    ['motorista bêbado', ['516-91']],
    ['carro estacionado na calçada', ['545-21']],
    ['parou na vaga de idoso', ['762-52']],
    ['cnh vencida', ['504-50']],
    ['emprestou o carro pro filho sem cnh', ['501-00', '506-10']],
    ['dirigindo com o celular na mão', ['763-31']],
    ['moto dando grau', ['705-61']],
    ['garupa sem capacete', ['704-81']],
    ['criança sem cadeirinha', ['519-30']],
    ['licenciamento atrasado', ['659-92']],
    ['furou o sinal vermelho', ['605-01']],
  ])('"%s" → %j', (texto, esperado) => {
    expect(condutasCirurgicas(texto)).toEqual(esperado);
  });

  it('texto genérico traz o grupo inteiro', () => {
    expect(condutasCirurgicas('sem cinto')).toEqual(['518-51', '518-52', '519-30']);
  });

  it('código ou artigo não passa pelo mapa', () => {
    expect(condutasCirurgicas('516-91')).toEqual([]);
    expect(condutasCirurgicas('art. 165')).toEqual([]);
  });
});
