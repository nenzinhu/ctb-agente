'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface Props {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
}

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export default function SearchableSelect({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onChange,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = normalizar(query.trim());
    if (!term) return options;
    return options.filter((option) => normalizar(`${option.label} ${option.keywords ?? ''}`).includes(term));
  }, [options, query]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  return (
    <div
      className="relative min-w-0 max-w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <label id={`${id}-label`} className="label">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="input flex w-full min-w-0 max-w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate font-semibold">{selected?.label ?? placeholder}</span>
        <span aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="absolute inset-x-0 z-40 mt-2 min-w-0 max-w-full overflow-hidden rounded-control border-2 border-ds-border bg-ds-surface p-2 shadow-xl">
          <label htmlFor={`${id}-search`} className="sr-only">{searchPlaceholder}</label>
          <input
            ref={searchRef}
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="input mb-2 w-full min-w-0 max-w-full"
          />
          <div
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="max-h-[min(24rem,55vh)] max-w-full space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          >
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm font-semibold uppercase leading-snug text-ds-text [overflow-wrap:anywhere] hover:border-ds-primary hover:bg-ds-soft focus-visible:border-ds-primary focus-visible:bg-ds-soft focus-visible:outline-none aria-selected:border-ds-accent aria-selected:bg-ds-accent/10"
              >
                {option.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-4 text-sm text-ds-subtle">Nenhum POP encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
