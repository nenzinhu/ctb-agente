'use client';

import { useId } from 'react';

interface ResultChoicesProps {
  label: string;
  hint: string;
  options: Array<{ value: string; title: string; description?: string }>;
  value: string;
  onChange: (value: string) => void;
}

/** Keep alternative sources visible and selectable with touch or the keyboard. */
export default function ResultChoices({ label, hint, options, value, onChange }: ResultChoicesProps) {
  const id = useId();
  return (
    <fieldset className="card card-pad min-w-0" aria-describedby={`${id}-hint`}>
      <legend className="sr-only">{label}</legend>
      <p className="text-base font-semibold text-ds-text" aria-hidden="true">{label}</p>
      <p id={`${id}-hint`} className="mt-1 text-sm text-ds-subtle">{hint}</p>
      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors sm:p-4 ${
                selected
                  ? 'border-ds-primary bg-ds-primary-soft'
                  : 'border-ds-line bg-ds-surface hover:border-ds-primary'
              }`}
            >
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-ds-primary"
              />
              <span className="min-w-0 flex-1 break-words">
                <span className="block text-sm font-semibold text-ds-text">{option.title}</span>
                {option.description && <span className="mt-1 block text-sm leading-relaxed text-ds-subtle">{option.description}</span>}
              </span>
              {selected && <span className="sr-only">Selecionada</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
