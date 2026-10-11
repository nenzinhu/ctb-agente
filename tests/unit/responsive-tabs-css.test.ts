import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

describe('abas responsivas', () => {
  it('mantém a indicação de rolagem em tablets menores que 1024 px', () => {
    expect(css).toMatch(/@media \(min-width: 1024px\)\s*{\s*\.nav-tabs\s*{\s*mask-image: none;/);
  });

  it('preserva alvos confortáveis em dispositivos de toque', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.tab\s*{\s*min-height: 40px;/);
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.nav-tab\s*{\s*min-height: 36px;/);
  });

  it('distribui as três abas de resultado em telas estreitas', () => {
    expect(css).toMatch(/@media \(max-width: 380px\)[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  });
});
