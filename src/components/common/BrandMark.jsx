import React from 'react';

const BrandMark = ({ compact = false }) => {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-slate-900 text-white ${
        compact ? 'h-8 w-8' : 'h-10 w-10'
      }`}
    >
      <svg viewBox="0 0 24 24" className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true">
        <path
          d="M5 20V7l7-4 7 4v13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 20v-7h6v7"
          fill="none"
          stroke="#fb923c"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

export default BrandMark;
