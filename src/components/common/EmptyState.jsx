import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items matching your request at this time.',
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md border border-slate-200 bg-white text-orange-700">
        <Icon className="h-8 w-8" />
      </div>
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <p className="mt-1.5 mb-6 max-w-sm text-sm font-medium text-slate-600">{description}</p>
      {action}
    </div>
  );
};

export default EmptyState;
