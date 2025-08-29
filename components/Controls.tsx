import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { LockIcon } from './icons/LockIcon';
import { Tooltip } from './Tooltip';

interface ControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isChatModeEnabled: boolean;
  setIsChatModeEnabled: (enabled: boolean) => void;
  mode: 'static' | 'animated';
  setMode: (mode: 'static' | 'animated') => void;
  animationSpeed: string;
  setAnimationSpeed: (speed: string) => void;
  animationDirection: string;
  setAnimationDirection: (direction: string) => void;
  onReset: () => void;
}

const examplePrompts = [
    "An SVG showing my GitHub stats: username, total repos, and total stars",
    "A retro typing animation of my name",
    "A dynamic GitHub contributions snake game",
    "An interactive Tic-Tac-Toe game",
    "A matrix-style digital rain animation",
];

const GITHUB_TOKEN_REGEX = /^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}$/;

export const Controls: React.FC<ControlsProps> = ({ 
  prompt, 
  setPrompt, 
  githubToken,
  setGithubToken,
  onGenerate, 
  isLoading,
  isChatModeEnabled,
  setIsChatModeEnabled,
  mode,
  setMode,
  animationSpeed,
  setAnimationSpeed,
  animationDirection,
  setAnimationDirection,
  onReset,
}) => {
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    if (githubToken) {
      setIsTokenValid(GITHUB_TOKEN_REGEX.test(githubToken));
    } else {
      setIsTokenValid(true); // Is valid if empty
    }
  }, [githubToken]);
  
  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const isGenerateDisabled = isLoading || !prompt.trim() || !isTokenValid;

  return (
    <div className="bg-[#0A0A0A]/60 border border-white/10 rounded-lg shadow-2xl h-full flex flex-col backdrop-blur-md">
      <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-md font-semibold text-gray-100">Controls</h2>
          <p className="text-sm text-gray-400">Tune the generation settings.</p>
        </div>
        <Tooltip text="Reset all settings to default">
          <button 
            onClick={onReset} 
            className="text-xs text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-md transition-colors"
            aria-label="Reset settings"
          >
            Reset
          </button>
        </Tooltip>
      </div>

      <div className="flex-grow p-4 space-y-5 overflow-y-auto min-h-0">
        
        <div>
          <Tooltip text="The AI is instructed to make all generated content accessible with titles and descriptions.">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2 cursor-help">
              Your Creative Idea
            </label>
          </Tooltip>
          <textarea 
            name="prompt" 
            id="prompt" 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none"
            rows={5} 
            placeholder="e.g., A beautiful, animated SVG showing my GitHub stats with a vaporwave theme..."
            aria-describedby="prompt-feedback"
          />
          {!prompt.trim() && <p id="prompt-feedback" className="text-xs text-gray-500 mt-1.5">Describe what you want to create.</p>}
        </div>

        <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Or try an example:</h3>
            <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example) => (
                    <button 
                        key={example} 
                        onClick={() => handleExampleClick(example)}
                        className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                        {example}
                    </button>
                ))}
            </div>
        </div>

        <div className="pt-3 border-t border-white/10">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Core Settings</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Tooltip text="Choose 'Animated' for dynamic SVGs or 'Static' for non-moving images.">
                        <label className="text-sm font-medium text-gray-200 cursor-help">Mode</label>
                    </Tooltip>
                    <div className="flex items-center bg-black/50 border border-white/10 rounded-md p-1 w-[180px]">
                        <button onClick={() => setMode('static')} className={`w-1/2 px-3 py-1 text-xs rounded-md transition-colors ${mode === 'static' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Static</button>
                        <button onClick={() => setMode('animated')} className={`w-1/2 px-3 py-1 text-xs rounded-md transition-colors ${mode === 'animated' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Animated</button>
                    </div>
                </div>
                 <div className="flex justify-between items-center">
                    <Tooltip text="Enable conversation mode to refine your SVG iteratively.">
                        <label className="text-sm font-medium text-gray-200 cursor-help">Chat Mode</label>
                    </Tooltip>
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            id="chat-mode"
                            className="peer sr-only"
                            checked={isChatModeEnabled}
                            onChange={(e) => setIsChatModeEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className={`pt-3 border-t border-white/10 transition-opacity duration-300 ${mode === 'static' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Animation Customization</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="animation-speed" className="block text-xs font-medium text-gray-400 mb-1.5">Speed</label>
              <select id="animation-speed" value={animationSpeed} onChange={(e) => setAnimationSpeed(e.target.value)} disabled={mode === 'static'} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm appearance-none">
                <option value="auto">Auto</option>
                <option value="normal">Normal</option>
                <option value="slow">Slow</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            <div>
              <label htmlFor="animation-direction" className="block text-xs font-medium text-gray-400 mb-1.5">Direction</label>
              <select id="animation-direction" value={animationDirection} onChange={(e) => setAnimationDirection(e.target.value)} disabled={mode === 'static'} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm appearance-none">
                <option value="auto">Auto</option>
                <option value="normal">Normal</option>
                <option value="reverse">Reverse</option>
                <option value="alternate">Alternate</option>
                <option value="alternate-reverse">Alternate-Reverse</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t border-white/10">
          <Tooltip text="Your token is used for GitHub API calls and is never stored or exposed.">
              <label htmlFor="github-token" className="block text-sm font-medium text-gray-300 mb-2 cursor-help">
                GitHub Token <span className="text-gray-500">(Optional)</span>
              </label>
          </Tooltip>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><LockIcon /></div>
            <input 
              type="password" name="github-token" id="github-token" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
              className={`w-full bg-black/50 border rounded-md p-2.5 pl-10 text-gray-200 placeholder-gray-600 focus:ring-2 focus:border-blue-500 transition duration-200 ${!isTokenValid ? 'border-red-500/70 focus:ring-red-500' : 'border-white/10 focus:ring-blue-500'}`}
              placeholder="ghp_... for dynamic stats"
              aria-describedby="token-error"
              aria-invalid={!isTokenValid}
            />
          </div>
          {!isTokenValid && <p id="token-error" className="text-xs text-red-400 mt-1.5">Invalid token format. Please check and try again.</p>}
        </div>
      </div>
        
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <button 
          onClick={onGenerate} 
          disabled={isGenerateDisabled}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-md transition-all duration-300 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
        >
          <SparklesIcon />
          <span>{isLoading ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>
    </div>
  );
};