import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
        AI Interactive README Generator
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        Describe a fun game or animation, and let AI generate the Markdown code for your GitHub profile.
      </p>
    </header>
  );
};
