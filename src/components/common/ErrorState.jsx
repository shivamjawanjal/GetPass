import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { buttonPrimary } from '../../utils/uiStyles';

const ErrorState = ({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again or check your network connection.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md border border-slate-200 bg-white text-orange-700">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <p className="mt-1.5 mb-6 max-w-sm text-sm font-medium text-slate-600">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonPrimary}>
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
