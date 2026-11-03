import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

describe('abas responsivas', () => {
  it('mantém a indicação de rolagem em tablets menores que 1024 px', () => {
    expect(css).toMatch(/@media \(min-width: 1024px\)\s*{\s*\.nav-tabs\s*{\s*mask-image: none;/);
  });

  it('preserva alvos de toque de pelo menos 44px em dispositivos de toque', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.tab\s*{\s*min-height: 44px;/);
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.nav-tab\s*{\s*min-height: 44px;/);
  });

  it('mantém 44px nos alvos menores mesmo sem ponteiro grosso', () => {
    expect(css).toMatch(/\.btn-sm\s*{\s*@apply min-h-\[44px\]/);
    expect(css).toMatch(/\.chip\s*{\s*@apply inline-flex min-h-\[44px\]/);
    expect(css).toMatch(/\.tab\s*{\s*@apply inline-flex min-h-\[44px\]/);
    expect(css).toMatch(/\.nav-tab\s*{\s*@apply flex min-h-\[44px\]/);
    expect(css).toMatch(/\.icon-btn\s*{\s*@apply inline-grid h-11 w-11/);
  });

  it('distribui as três abas de resultado em telas estreitas', () => {
    expect(css).toMatch(/@media \(max-width: 380px\)[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  });
});
