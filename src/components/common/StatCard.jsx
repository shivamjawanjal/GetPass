import React from 'react';
import { focusRing } from '../../utils/uiStyles';

const StatCard = ({ title, value, icon: Icon, description, trend, color = 'orange', onClick }) => {
  const colorMap = {
    orange: { tile: 'bg-orange-700 text-white', icon: 'text-white' },
    slate: { tile: 'bg-slate-200', icon: 'text-slate-700' },
  };

  const c = colorMap[color] || colorMap.orange;
  const isClickable = typeof onClick === 'function';

  const handleKeyDown = (e) => {
    if (!isClickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`rounded-md border border-slate-200 bg-white p-5 ${
        isClickable ? `cursor-pointer hover:bg-slate-50 ${focusRing}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
          <h3 className="mt-1.5 text-3xl font-bold leading-none tracking-tight text-slate-900">{value}</h3>
        </div>
        {Icon && (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${c.tile} ${c.icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {(description || trend) && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
          <span className="font-medium">{description}</span>
          {trend && <span className="font-bold text-slate-900">{trend}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
