import React from 'react';

export const LoadingPlaceholder: React.FC = () => {
  return (
    <div className="p-6 w-full h-full animate-pulse">
        <div className="space-y-6">
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
            <div className="space-y-3 mt-8">
                <div className="h-4 bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="h-40 bg-slate-700 rounded-lg mt-8"></div>
            <div className="space-y-3 mt-8">
                <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                <div className="h-4 bg-slate-700 rounded"></div>
            </div>
        </div>
    </div>
  );
};
