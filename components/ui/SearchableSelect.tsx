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
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = normalizar(query.trim());
    if (!term) return options;
    return options.filter((option) => normalizar(`${option.label} ${option.keywords ?? ''}`).includes(term));
  }, [options, query]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      searchRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  const selectActive = () => {
    const option = filtered[activeIndex];
    if (!option) return;
    onChange(option.value);
    close();
  };

  const moveActive = (nextIndex: number) => {
    if (filtered.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(nextIndex, filtered.length - 1)));
  };

  return (
    <div
      ref={rootRef}
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
        aria-labelledby={`${id}-label ${id}-value`}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="input flex w-full min-w-0 max-w-full items-center justify-between gap-3 text-left"
      >
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate font-semibold">{selected?.label ?? placeholder}</span>
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
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveActive(activeIndex + 1);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveActive(activeIndex - 1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                moveActive(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                moveActive(filtered.length - 1);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                selectActive();
              }
            }}
            aria-controls={`${id}-listbox`}
            aria-activedescendant={filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            placeholder={searchPlaceholder}
            className="input mb-2 w-full min-w-0 max-w-full"
          />
          <div
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="max-h-[min(24rem,55vh)] max-w-full space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          >
            {filtered.map((option, index) => (
              <button
                key={option.value}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                data-active={index === activeIndex ? 'true' : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm font-semibold uppercase leading-snug text-ds-text [overflow-wrap:anywhere] hover:border-ds-primary hover:bg-ds-soft focus-visible:border-ds-primary focus-visible:bg-ds-soft focus-visible:outline-none aria-selected:border-ds-accent aria-selected:bg-ds-accent/10 data-[active=true]:border-ds-primary data-[active=true]:bg-ds-soft"
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
