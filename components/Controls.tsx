
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { LockIcon } from './icons/LockIcon';

interface ControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isChatModeEnabled: boolean;
  setIsChatModeEnabled: (enabled: boolean) => void;
}

const examplePrompts = [
    "A retro typing animation of my name, 'Alex Doe'",
    "A dynamic GitHub contributions snake game",
    "An interactive Tic-Tac-Toe game you can play in the README",
    "A matrix-style digital rain animation",
];

export const Controls: React.FC<ControlsProps> = ({ 
  prompt, 
  setPrompt, 
  githubToken,
  setGithubToken,
  onGenerate, 
  isLoading,
  isChatModeEnabled,
  setIsChatModeEnabled,
}) => {

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };
  
  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg h-fit">
      <h2 className="text-2xl font-semibold mb-4 text-purple-400">Describe Your Idea</h2>
      <div className="space-y-6">
        
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
            What interactive element do you want to create?
          </label>
          <textarea 
            name="prompt" 
            id="prompt" 
            value={prompt} 
            onChange={handlePromptChange} 
            className="form-textarea" 
            rows={5} 
            placeholder="e.g., A beautiful, animated SVG showing my GitHub stats with a vaporwave theme..."
          />
        </div>

        <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Or try an example:</h3>
            <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, index) => (
                    <button 
                        key={index} 
                        onClick={() => handleExampleClick(example)}
                        className="text-xs bg-gray-700/50 border border-gray-600 text-gray-300 px-3 py-1 rounded-full hover:bg-gray-700 hover:border-purple-400 transition"
                    >
                        {example}
                    </button>
                ))}
            </div>
        </div>

        <div>
          <label htmlFor="github-token" className="block text-sm font-medium text-gray-300 mb-2">
            GitHub Token <span className="text-gray-500">(Optional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <LockIcon />
            </div>
            <input 
              type="password"
              name="github-token" 
              id="github-token" 
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="form-input pl-10" 
              placeholder="For dynamic stats like contribution graphs"
            />
          </div>
           <p className="mt-1 text-xs text-gray-500">Your token is sent to the AI for API calls and is not stored.</p>
        </div>

        <style>{`
          .form-textarea, .form-input {
            width: 100%;
            background-color: rgb(17 24 39 / 1);
            border: 1px solid #4b5563;
            border-radius: 0.375rem;
            padding: 0.5rem 0.75rem;
            color: #d1d5db;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .form-textarea {
            resize: vertical;
          }
          .form-textarea:focus, .form-input:focus {
            outline: none;
            border-color: #a78bfa;
            box-shadow: 0 0 0 2px rgb(167 139 250 / 0.5);
          }
          .form-input.pl-10 {
            padding-left: 2.5rem;
          }
        `}</style>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <label htmlFor="chat-mode-toggle" className="flex flex-col cursor-pointer">
              <span className="font-medium text-gray-300">Enable Chat Mode</span>
              <span className="text-xs text-gray-500">Allows for follow-up refinements.</span>
            </label>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="chat-mode-toggle" 
                className="sr-only peer" 
                checked={isChatModeEnabled}
                onChange={() => setIsChatModeEnabled(!isChatModeEnabled)}
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </div>

        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2.5 px-4 rounded-md hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            'Generating...'
          ) : (
             <>
                <SparklesIcon />
                <span className="ml-2">Generate Markdown</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
};
