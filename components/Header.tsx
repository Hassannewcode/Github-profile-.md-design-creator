import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex-shrink-0 px-2">
      <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
        AI Interactive README Generator
      </h1>
      <p className="text-sm text-gray-400">
        Turn your creative ideas into interactive Markdown for your GitHub profile.
      </p>
    </header>
  );
};
