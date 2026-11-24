import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { focusRing } from '../../utils/uiStyles';

const Select = ({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="flex items-center gap-1 text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="font-bold text-orange-700">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full appearance-none rounded-md border bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${focusRing} ${
            error ? 'border-orange-700' : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt, idx) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return (
              <option key={idx} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
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

export default Select;
