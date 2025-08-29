import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex-shrink-0 px-2">
      <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
        AI GitHub Profile Designer
      </h1>
      <p className="text-sm text-gray-400">
        Create a stunning, animated README for your GitHub profile.
      </p>
    </header>
  );
};