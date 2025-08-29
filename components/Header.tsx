import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex-shrink-0 px-2">
      <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
        AI Creative Code Generator
      </h1>
      <p className="text-sm text-gray-400">
        Bring your creative ideas to life with AI-generated code for designs and animations.
      </p>
    </header>
  );
};
