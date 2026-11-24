import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { focusRing } from '../../utils/uiStyles';

const Toast = ({ message, type = 'info', onClose }) => {
  const configs = {
    success: {
      label: 'Success',
      icon: CheckCircle2,
      style: 'border-slate-200 bg-white text-slate-900',
      iconColor: 'text-orange-700',
      bar: 'bg-orange-700',
    },
    error: {
      label: 'Error',
      icon: AlertCircle,
      style: 'border-slate-300 bg-slate-50 text-slate-900',
      iconColor: 'text-slate-900',
      bar: 'bg-slate-900',
    },
    warning: {
      label: 'Warning',
      icon: AlertTriangle,
      style: 'border-slate-200 bg-white text-slate-900',
      iconColor: 'text-orange-800',
      bar: 'bg-orange-800',
    },
    info: {
      label: 'Info',
      icon: Info,
      style: 'border-slate-200 bg-white text-slate-900',
      iconColor: 'text-slate-600',
      bar: 'bg-slate-500',
    },
  };

  const cfg = configs[type] || configs.info;
  const Icon = cfg.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative flex items-start justify-between gap-3 overflow-hidden rounded-md border px-4 py-3 shadow-sm ${cfg.style}`}
      style={{ minWidth: '280px', maxWidth: '420px' }}
    >
      <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-md ${cfg.bar}`} />

      <div className="flex items-start gap-3 pl-2">
        <Icon className={`h-5 w-5 shrink-0 ${cfg.iconColor}`} aria-hidden="true" />
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {cfg.label}
          </span>
          <span className="block text-sm font-semibold">{message}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={`ml-2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Toast;
