

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    if (refinementPrompt.trim() && !isRefining) {
      try {
        await onRefine(refinementPrompt);
      } finally {
        // This ensures the input is cleared after the AI operation completes, even if it fails.
        setRefinementPrompt('');
      }
    }
  };

  const renderContent = () => {
    if (isLoading && !markdown) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-400">
          <p className="font-semibold">AI is starting to generate...</p>
          <p className="text-sm">The code will appear here live as it's created.</p>
        </div>
      );
    }
    if (error) {
      return <div className="text-red-400 text-center p-4">{error}</div>;
    }
    if (markdown) {
      if (activeTab === 'preview') {
        return (
            <div className="markdown-preview p-6 w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
                </ReactMarkdown>
            </div>
        );
      }
      // Code tab
      return (
        <SyntaxHighlighter
          language="markdown"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            backgroundColor: '#111827',
            width: '100%',
            height: '100%',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }
          }}
          wrapLongLines={true}
        >
          {markdown}
        </SyntaxHighlighter>
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
      <style>{`
          .markdown-preview h1, .markdown-preview h2, .markdown-preview h3, .markdown-preview h4, .markdown-preview h5, .markdown-preview h6 {
            margin-top: 1.5em;
            margin-bottom: 1em;
            font-weight: 600;
          }
          .markdown-preview h1 { font-size: 2em; border-bottom: 1px solid #4a5568; padding-bottom: 0.3em; }
          .markdown-preview h2 { font-size: 1.5em; border-bottom: 1px solid #4a5568; padding-bottom: 0.3em; }
          .markdown-preview h3 { font-size: 1.25em; }
          .markdown-preview p { line-height: 1.6; margin-bottom: 1em; }
          .markdown-preview a { color: #a78bfa; text-decoration: none; }
          .markdown-preview a:hover { text-decoration: underline; }
          .markdown-preview code {
            background-color: rgb(17 24 39 / 1);
            color: #d1d5db;
            padding: .2em .4em;
            margin: 0;
            font-size: 85%;
            border-radius: 6px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
          .markdown-preview pre {
            background-color: #111827;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin-bottom: 1em;
          }
          .markdown-preview pre code {
            padding: 0;
            background-color: transparent;
            color: inherit;
          }
          .markdown-preview img {
            max-width: 100%;
            height: auto;
            display: block;
            margin-left: auto;
            margin-right: auto;
            margin-top: 1em;
            margin-bottom: 1em;
            background-color: #fff;
          }
           .markdown-preview ul, .markdown-preview ol {
            padding-left: 2em;
            margin-bottom: 1em;
          }
          .markdown-preview li {
            margin-bottom: 0.25em;
          }
          .markdown-preview blockquote {
            padding: 0 1em;
            color: #9ca3af;
            border-left: 0.25em solid #4b5563;
            margin-bottom: 1em;
          }
        `}</style>
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex items-end">
          <TabButton isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
            <EyeIcon /> Preview
          </TabButton>
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
      
      <div className="relative bg-gray-900 flex-grow min-h-[400px] lg:min-h-0 flex items-start justify-center">
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
                  <SendIcon />
                </button>
              </div>
           </form>
         </div>
       )}
    </div>
  );
};