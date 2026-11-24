import React from 'react';

const LoadingSpinner = ({ label = 'Loading...', fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-10">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-orange-700"
        role="status"
        aria-label={label}
      />
      <div className="text-center">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-500">Please wait...</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
