import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { Tooltip } from './Tooltip';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { LockIcon } from './icons/LockIcon';

interface GenerationHistoryItem {
    id: number;
    preview: string;
    timestamp: string;
}

interface ControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  designStyle: string;
  setDesignStyle: (style: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isChatModeEnabled: boolean;
  setIsChatModeEnabled: (enabled: boolean) => void;
  onReset: () => void;
  onNewTask: () => void;
  generationHistory: GenerationHistoryItem[];
  activeHistoryId: number | null;
  onSelectHistory: (id: number) => void;
  onClearHistory: () => void;
}

const examplePrompts = [
    "A senior developer profile with sections for skills, stats, and social media links.",
    "A profile for a student, highlighting my current learning journey and projects.",
    "A README for my organization, introducing our team and key repositories.",
    "A fun, animated profile with lots of emojis and a 'snake' contribution graph.",
    "A clean, minimalist profile with just an intro and my GitHub stats.",
];

const DESIGN_STYLES = ['Cyberpunk', 'Retro', 'Minimalist', 'Synthwave', 'Corporate', 'Playful'];

export const Controls: React.FC<ControlsProps> = ({ 
  prompt, 
  setPrompt, 
  designStyle,
  setDesignStyle,
  githubToken,
  setGithubToken,
  onGenerate, 
  isLoading,
  isChatModeEnabled,
  setIsChatModeEnabled,
  onReset,
  onNewTask,
  generationHistory,
  activeHistoryId,
  onSelectHistory,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'history'>('controls');

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setActiveTab('controls');
  };

  const isGenerateDisabled = isLoading || !prompt.trim();
  
  const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        {children}
    </button>
  );

  return (
    <div className="bg-[#0A0A0A]/60 border border-white/10 rounded-lg shadow-2xl h-full flex flex-col backdrop-blur-md">
      <div className="p-2.5 border-b border-white/10 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg">
                <TabButton isActive={activeTab === 'controls'} onClick={() => setActiveTab('controls')}>Controls</TabButton>
                <TabButton isActive={activeTab === 'history'} onClick={() => setActiveTab('history')}>History</TabButton>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Tooltip text="New Task">
              <button onClick={onNewTask} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-md transition-colors" aria-label="Start new task">
                <PlusIcon />
              </button>
            </Tooltip>
            <Tooltip text="Reset all settings to default">
              <button onClick={onReset} className="text-xs text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-md transition-colors" aria-label="Reset settings">
                Reset
              </button>
            </Tooltip>
        </div>
      </div>

      {activeTab === 'controls' && (
        <>
            <div className="flex-grow p-4 space-y-5 overflow-y-auto min-h-0 custom-scrollbar">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Design Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {DESIGN_STYLES.map(style => (
                            <button 
                                key={style}
                                onClick={() => setDesignStyle(style)}
                                className={`text-center text-sm px-3 py-2 rounded-md border transition-colors ${designStyle === style ? 'bg-blue-600 border-blue-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                    Describe your profile
                </label>
                <textarea 
                    name="prompt" 
                    id="prompt" 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none"
                    rows={5} 
                    placeholder="e.g., I'm a full-stack developer from California. I love working with TypeScript, React, and Go. Include sections for my tech stack and GitHub stats."
                    aria-describedby="prompt-feedback"
                />
                {!prompt.trim() && <p id="prompt-feedback" className="text-xs text-gray-500 mt-1.5">Tell the AI what to include in your README.</p>}
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Need ideas? Try one of these:</h3>
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
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Settings</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Tooltip text="Enable conversation mode to refine your README iteratively.">
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
                        <div className="flex justify-between items-center">
                            <Tooltip text="Your token enables more accurate stats and is stored only in your browser.">
                                <label htmlFor="github-token" className="flex items-center gap-2 text-sm font-medium text-gray-200 cursor-help">
                                    <LockIcon />
                                    GitHub Token
                                </label>
                            </Tooltip>
                            <div className="relative w-1/2">
                                <input
                                    type="password"
                                    id="github-token"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    placeholder="ghp_..."
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-1.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                
            <div className="p-4 border-t border-white/10 flex-shrink-0">
                <button 
                onClick={onGenerate} 
                disabled={isGenerateDisabled}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-md transition-all duration-300 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                >
                <SparklesIcon />
                <span>{isLoading ? 'Designing...' : 'Design Profile'}</span>
                </button>
            </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="flex-grow p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-300">Generation History</h3>
            <Tooltip text="Clear all history">
                <button
                    onClick={onClearHistory}
                    disabled={generationHistory.length === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Clear all history"
                >
                    <TrashIcon />
                </button>
            </Tooltip>
          </div>
          {generationHistory.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-center text-gray-500">
              <p>Your generated READMEs will appear here.</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar -mr-2 pr-2">
              {generationHistory.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors border ${activeHistoryId === item.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}`}
                >
                  <p className="text-sm font-medium text-gray-200 truncate">{item.preview}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
