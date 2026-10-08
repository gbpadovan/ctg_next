'use client';

import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface IsoDateInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  focusColor?: 'amber' | 'blue';
  placeholder?: string;
}

export function IsoDateInput({
  id,
  name,
  value,
  onChange,
  min,
  max,
  required,
  className = '',
  inputClassName = '',
  focusColor = 'amber',
  placeholder = 'YYYY-MM-DD',
}: IsoDateInputProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const focusBorderClass =
    focusColor === 'blue'
      ? 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
      : 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30';

  const triggerPicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch {
          // ignore if showPicker fails
        }
      }
      dateInputRef.current.focus();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 1. Visible ISO text input displaying YYYY-MM-DD */}
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        pattern="^\d{4}-\d{2}-\d{2}$"
        title="Format: YYYY-MM-DD (e.g. 2026-10-08)"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-3 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none transition ${focusBorderClass} ${inputClassName}`}
      />

      {/* 2. Calendar icon and picker overlay */}
      <div className="absolute right-2 flex items-center justify-center w-6 h-6">
        <button
          type="button"
          onClick={triggerPicker}
          tabIndex={-1}
          title="Open calendar picker"
          className="text-slate-400 hover:text-amber-400 transition-colors p-1 rounded-md"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>

        {/* 3. Invisible native date input on top of the icon to open native calendar picker */}
        <input
          ref={dateInputRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
          min={min}
          max={max}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}
