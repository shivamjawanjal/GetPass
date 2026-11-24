import React from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, CheckSquare, Ban } from 'lucide-react';
import { PASS_STATUS } from '../../utils/constants';

const STATUS_CONFIGS = {
  [PASS_STATUS.PENDING]: {
    label: 'Pending Review',
    style: 'border-orange-300 bg-orange-50 text-orange-800',
    icon: Clock,
  },
  [PASS_STATUS.APPROVED]: {
    label: 'Approved',
    style: 'border-orange-700 bg-orange-700 text-white',
    icon: CheckCircle2,
  },
  [PASS_STATUS.USED]: {
    label: 'Used (Scanned)',
    style: 'border-slate-900 bg-slate-900 text-white',
    icon: CheckSquare,
  },
  [PASS_STATUS.REJECTED]: {
    label: 'Rejected',
    style: 'border-slate-400 bg-slate-200 text-slate-900',
    icon: XCircle,
  },
  [PASS_STATUS.EXPIRED]: {
    label: 'Expired',
    style: 'border-slate-300 border-dashed bg-slate-100 text-slate-600',
    icon: AlertTriangle,
  },
  [PASS_STATUS.CANCELLED]: {
    label: 'Cancelled',
    style: 'border-slate-300 bg-white text-slate-600',
    icon: Ban,
  },
};

const StatusBadge = ({ status, size = 'md' }) => {
  const key = status?.toLowerCase();
  const config = STATUS_CONFIGS[key] || {
    label: status || 'Unknown',
    style: 'border-slate-300 bg-slate-100 text-slate-700',
    icon: Clock,
  };

  const IconComponent = config.icon;
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${config.style} ${sizeClasses}`}>
      <IconComponent className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
