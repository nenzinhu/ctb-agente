import { classifyPwaRequest } from '@/lib/pwa/cache-policy';

const classify = (url: string, options: Partial<{ method: string; destination: string; mode: string }> = {}) =>
  classifyPwaRequest({
    url,
    method: options.method ?? 'GET',
    destination: options.destination ?? '',
    mode: options.mode ?? 'cors',
  });

describe('classifyPwaRequest', () => {
  it.each([
    'https://app.test/api/consulta',
    'https://app.test/api/health?fresh=1',
    'https://app.test/admin',
    'https://app.test/admin/login',
    'https://app.test/%61pi/consulta',
  ])('mantém %s somente na rede', (url) => {
    expect(classify(url)).toBe('network-only');
  });

  it('nunca cacheia método mutável', () => {
    expect(classify('https://app.test/icons/icon.png', { method: 'POST', destination: 'image' })).toBe('network-only');
  });

  it.each([
    ['https://app.test/_next/static/app.js', 'script'],
    ['https://app.test/icons/icon.png', 'image'],
    ['https://app.test/font.woff2', 'font'],
    ['https://app.test/app.css', 'style'],
  ])('cacheia ativo estático %s', (url, destination) => {
    expect(classify(url, { destination })).toBe('static');
  });

  it('permite fallback apenas para navegação pública', () => {
    expect(classify('https://app.test/consulta', { mode: 'navigate' })).toBe('public-navigation');
    expect(classify('https://app.test/consulta?q=placa-ABC1D23', { mode: 'navigate' })).toBe('network-only');
    expect(classify('https://app.test/rota-futura', { mode: 'navigate' })).toBe('network-only');
    expect(classify('https://app.test/data.json')).toBe('network-only');
  });

  it('falha fechado para caminho com codificação inválida', () => {
    expect(classify('https://app.test/%E0%A4%A')).toBe('network-only');
  });
});
