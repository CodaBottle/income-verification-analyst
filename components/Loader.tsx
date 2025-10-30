
import React from 'react';

export const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="w-12 h-12 rounded-full animate-spin border-4 border-dashed border-indigo-600 border-t-transparent"></div>
    <p className="text-slate-600 dark:text-slate-400 font-medium">AI is analyzing your documents...</p>
  </div>
);
