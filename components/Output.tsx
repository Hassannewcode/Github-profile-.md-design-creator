import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CodeIcon } from './icons/CodeIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SendIcon } from './icons/SendIcon';

interface OutputProps {
  markdown: string;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  onRefine: (prompt: string) => Promise<void>;
  isChatModeEnabled: boolean;
}

export const Output: React.FC<OutputProps> = ({ markdown, isLoading, isRefining, error, onRefine, isChatModeEnabled }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [refinementPrompt, setRefinementPrompt] = useState('');

  // Reset to preview tab whenever new markdown is generated
  useEffect(() => {
    if (markdown) {
      setActiveTab('preview');
    }
  }, [markdown]);
  
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  const handleCopy = () => {
    if (markdown) {
      navigator.clipboard.writeText(markdown);
      setCopied(true);
    }
  };
  
  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (refinementPrompt.trim()) {
      await onRefine(refinementPrompt);
      setRefinementPrompt('');
    }
  };

  const svgDataUri = useMemo(() => {
    if (!markdown) return null;
    const match = markdown.match(/!\[[^\]]*\]\((data:image\/svg\+xml[^)]*)\)/);
    return match ? match[1] : null;
  }, [markdown]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-400">
           <svg className="animate-spin h-8 w-8 text-purple-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          <p className="font-semibold">AI is crafting your masterpiece...</p>
          <p className="text-sm">This can take a few moments for complex ideas.</p>
        </div>
      );
    }
    if (error) {
      return <div className="text-red-400 text-center p-4">{error}</div>;
    }
    if (markdown) {
      if (activeTab === 'preview') {
        return svgDataUri ? (
          <div className="w-full h-full flex items-center justify-center p-4">
             <img src={svgDataUri} alt="Generated SVG Preview" className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className="text-center text-gray-500 p-4">
            <p>No SVG preview available for this output.</p>
            <p className="text-sm mt-1">Switch to the 'Code' tab to see the raw Markdown.</p>
          </div>
        );
      }
      // Code tab
      return (
        <pre className="text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap break-words p-4">
          <code>{markdown}</code>
        </pre>
      );
    }
    return (
      <div className="text-center text-gray-500">
        <p>Your generated README.md code will appear here.</p>
        <p className="text-sm mt-1">Describe an idea and click "Generate".</p>
      </div>
    );
  };
  
  const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
          isActive
            ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-400'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
        }`}
      >
        {children}
    </button>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex items-end">
          <TabButton isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
            <EyeIcon /> Preview
          </TabButton>
          {/* Fix: Corrected closing tag from </Button> to </TabButton> */}
          <TabButton isActive={activeTab === 'code'} onClick={() => setActiveTab('code')}>
            <CodeIcon /> Code
          </TabButton>
        </div>
        {markdown && !isLoading && (
          <button
            onClick={handleCopy}
            className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition text-gray-300 flex items-center gap-2 text-sm"
            aria-label="Copy markdown to clipboard"
          >
            {copied ? 'Copied!' : <><ClipboardIcon /> Copy Code</>}
          </button>
        )}
      </div>
      
      <div className="relative bg-gray-900 flex-grow min-h-[400px] lg:min-h-0 flex items-center justify-center">
        <div className="w-full h-full max-h-[calc(100vh-400px)] overflow-auto">
             {renderContent()}
        </div>
      </div>
      
       {isChatModeEnabled && markdown && !isLoading && (
         <div className="p-4 border-t border-gray-700">
           <form onSubmit={handleRefineSubmit}>
              <label htmlFor="refinement" className="text-sm font-medium text-gray-300 mb-2 block">
                Want to make a change?
              </label>
              <div className="relative">
                <textarea
                  id="refinement"
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder="e.g., 'make the background dark blue' or 'change the animation to be slower'"
                  disabled={isRefining}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 pr-20 text-gray-200 focus:ring-purple-500 focus:border-purple-500 transition resize-none"
                  rows={2}
                />
                <button 
                  type="submit"
                  disabled={isRefining || !refinementPrompt.trim()}
                  className="absolute right-2 bottom-2 bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Refine SVG"
                >
                  {isRefining ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <SendIcon />
                  )}
                  
                </button>
              </div>
           </form>
         </div>
       )}
    </div>
  );
};