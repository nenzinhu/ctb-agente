import { extrairArtigosCtb } from '@/lib/ctb/artigos';

it('separa artigos sem confundir citações, ordinais ou o anexo com a redação', () => {
  const textos = extrairArtigosCtb('Art. 7o-A. Texto do artigo.\n--- Página 2 ---\nContinuação art. 8.\nArt. 8º Outra redação.\nArt. 341. Último artigo.\nANEXO I\nDEFINIÇÕES');
  expect(textos.map(a => a.numero)).toEqual(['7-A', '8', '341']);
  expect(textos[0].texto).toContain('Continuação art. 8.');
  expect(textos[0].texto).not.toContain('Página 2');
  expect(textos[2].texto).not.toContain('DEFINIÇÕES');
});

it('recupera artigos do acervo real sem misturar os sufixos', () => {
  const fs = require('node:fs');
  const artigos = extrairArtigosCtb(fs.readFileSync('data/acervo/ctb-lei-9503-compilado.txt', 'utf8'));
  expect(artigos.length).toBeGreaterThan(300);
  expect(artigos.find(a => a.numero === '165')?.texto).toContain('Dirigir sob a influência');
  expect(artigos.find(a => a.numero === '165-A')?.texto).toContain('Recusar-se');
  expect(artigos.find(a => a.numero === '165')?.texto).not.toContain('Art. 165-A. Recusar-se');
});

it('preserva a continuação do 147-A e não cria outro 147 a partir de uma citação quebrada em linha', () => {
  const fs = require('node:fs');
  const artigos = extrairArtigosCtb(fs.readFileSync('data/acervo/ctb-lei-9503-compilado.txt', 'utf8'));
  expect(artigos.filter(a => a.numero === '147')).toHaveLength(1);
  expect(artigos.find(a => a.numero === '147-A')?.texto).toContain('art. 147 desta Lei deve ser acessível');
  expect(artigos.find(a => a.numero === '147-A')?.texto).toContain('§ 2o É assegurado');
  expect(new Set(artigos.map(a => a.numero)).size).toBe(artigos.length);
});
