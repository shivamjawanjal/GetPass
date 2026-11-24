import React, { useId } from 'react';
import { Calendar } from 'lucide-react';
import { focusRing } from '../../utils/uiStyles';

const DatePicker = ({
  label,
  id,
  value,
  onChange,
  required = false,
  error,
  hint,
  min,
  max,
  disabled = false,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="flex items-center gap-1 text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="font-bold text-orange-700">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700">
          <Calendar className="h-4 w-4" aria-hidden="true" />
        </div>
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full rounded-md border bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${focusRing} ${
            error ? 'border-orange-700' : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs font-medium text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-orange-800">
          {error}
        </p>
      )}
    </div>
  );
};

export default DatePicker;
