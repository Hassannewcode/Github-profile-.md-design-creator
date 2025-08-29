import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const getPositionClasses = () => {
    switch (position) {
        case 'bottom': return 'top-full mt-2';
        case 'left': return 'right-full mr-2 -translate-y-1/2 top-1/2';
        case 'right': return 'left-full ml-2 -translate-y-1/2 top-1/2';
        default: return 'bottom-full mb-2 -translate-x-1/2 left-1/2';
    }
  }

  const getTransformOrigin = () => {
     switch (position) {
        case 'bottom': return 'transform-origin: top center;';
        case 'left': return 'transform-origin: right center;';
        case 'right': return 'transform-origin: left center;';
        default: return 'transform-origin: bottom center;';
    }
  }

  return (
    <div className="relative group">
      {children}
      <div 
        className={`absolute ${getPositionClasses()} w-max max-w-xs bg-slate-900 text-white text-xs rounded-md py-1 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 scale-95 group-hover:scale-100`}
        style={{ transformOrigin: getTransformOrigin() }}
      >
        {text}
      </div>
    </div>
  );
};
