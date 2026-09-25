'use client';

import { useState } from 'react';

const ITENS = [
  { valor: '1', label: 'Art. 165 — Dirigir em valores diferentes' },
  { valor: '2', label: 'Art. 166 — Conduta do condutor e passageiro' },
  { valor: '3', label: 'Art. 167 — Regras de precedência de passagem' },
  { valor: '4', label: 'Art. 168 — Derrapagem, inversão e ultrapassagem' },
  { valor: '5', label: 'Art. 173 — Uso de batedor eletrônico (BAF)' },
];

/**
 * Select dropdown demonstrativo conforme design system PMRV-SC.
 * Borda 2px, cor primária no focus, seta SVG inline.
 */
export default function DemoSelect() {
  const [valor, setValor] = useState<string>('1');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const selecionado = ITENS.find((i) => i.valor === valor);

  return (
    <div className="container-centro space-y-8">
      <h1 className="titulo-secundario text-center">Select Dropdowns — Design System</h1>

      {/* Select customizado (dropdown menu) */}
      <div className="max-w-md">
        <label className="select-label" id="exemplo-select-label">
          Artigo selecionado
        </label>
        <div className="relative">
          <button
            type="button"
            className="select w-full text-left"
            aria-expanded={dropdownAberto}
            aria-haspopup="listbox"
            aria-labelledby="exemplo-select-label"
            onClick={() => setDropdownAberto((v) => !v)}
            onBlur={() => setTimeout(() => setDropdownAberto(false), 150)}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  valor === '1' ? 'bg-primary-accent' : 'bg-muted'
                }`}
              />
              {selecionado ? selecionado.label : 'Selecione...'}
            </span>
          </button>

          {dropdownAberto && (
            <ul className="select-menu" role="listbox" aria-labelledby="exemplo-select-label">
              {ITENS.map((item) => (
                <li key={item.valor} role="option" aria-selected={item.valor === valor}>
                  <button
                    type="button"
                    className={`select-menu-item w-full text-left ${
                      item.valor === valor ? 'select-menu-item-ativo' : 'select-menu-item-inativo'
                    }`}
                    onClick={() => {
                      setValor(item.valor);
                      setDropdownAberto(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          Valor atual: <span className="font-semibold uppercase text-primary">{valor}</span>
        </p>
      </div>

      {/* Select nativo estilizado (inspirado no design system) */}
      <div className="max-w-md">
        <label className="select-label" id="select-nativo-label">
          Forma de pagamento
        </label>
        <select
          className="select mt-1 text-left"
          aria-labelledby="select-nativo-label"
          defaultValue="boleto"
          onChange={(e) => console.log('change', e.target.value)}
        >
          <option value="boleto">Boleto bancário</option>
          <option value="cartao">Cartão de crédito</option>
          <option value="pix">PIX</option>
        </select>
      </div>

      {/* Select pequeno */}
      <div className="max-w-xs">
        <label className="select-label text-xs">Filtro rápido</label>
        <select className="select mt-1 text-sm py-2">
          <option>Todas as gravidades</option>
          <option>Leve</option>
          <option>Média</option>
          <option>Grave</option>
        </select>
      </div>
    </div>
  );
}
