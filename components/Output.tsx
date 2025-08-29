import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CodeIcon } from './icons/CodeIcon';
import { EyeIcon } from './icons/EyeIcon';
import { LoadingPlaceholder } from './LoadingPlaceholder';
import { Tooltip } from './Tooltip';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { ChatPanel } from './ChatPanel';


interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  markdown?: string;
  id: number;
}
interface OutputProps {
  markdown: string;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  onSendMessage: (prompt: string) => Promise<void>;
  isChatModeEnabled: boolean;
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  chatHistory: ChatMessage[];
  onApplyCode: (markdown: string) => void;
}

export const Output: React.FC<OutputProps> = ({ 
    markdown, isLoading, isRefining, error, onSendMessage, isChatModeEnabled, 
    historyIndex, historyLength, onUndo, onRedo, chatHistory, onApplyCode
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);

  const outputContainerRef = useRef<HTMLDivElement>(null);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [chatHeight, setChatHeight] = useState(250);

  const handleChatResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  }, []);

  const handleChatResizeMouseUp = useCallback(() => {
    setIsResizingChat(false);
  }, []);

  const handleChatResizeMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingChat && outputContainerRef.current) {
        const containerRect = outputContainerRef.current.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        if (newHeight > 120 && newHeight < containerRect.height - 150) {
            setChatHeight(newHeight);
        }
    }
  }, [isResizingChat]);

  useEffect(() => {
    window.addEventListener('mousemove', handleChatResizeMouseMove);
    window.addEventListener('mouseup', handleChatResizeMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleChatResizeMouseMove);
        window.removeEventListener('mouseup', handleChatResizeMouseUp);
    };
  }, [handleChatResizeMouseMove, handleChatResizeMouseUp]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isLoading && !markdown) {
      const allMessages = [
        'Booting AI core...',
        'Analyzing creative request...',
        'Engaging aesthetic subroutines...',
        'Calibrating SVG vector matrix...',
        'Streaming initial response...',
      ];
      setLoadingMessages([allMessages[0]]);
      let messageIndex = 1;
      intervalId = setInterval(() => {
        if (messageIndex < allMessages.length) {
          setLoadingMessages(prev => [...prev, allMessages[messageIndex]]);
          messageIndex++;
        } else {
          clearInterval(intervalId);
        }
      }, 700);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (!isLoading) setLoadingMessages([]);
    };
  }, [isLoading, markdown]);

  useEffect(() => {
    if (markdown) setActiveTab('preview');
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

  const renderContent = () => {
    if (isLoading && !markdown) {
      const TerminalAnimation = () => (
        <div className="flex flex-col items-start justify-start w-full h-full p-6 font-mono text-sm text-gray-400">
            {loadingMessages.map((msg, index) => (
                <p key={index} className="whitespace-pre-wrap animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                  <span className="text-cyan-400/80 mr-2">{'>'}</span>{msg}
                </p>
            ))}
            <div className="blinking-cursor mt-2 text-cyan-400 text-lg">▋</div>
        </div>
      );
      if (activeTab === 'preview') return <LoadingPlaceholder />;
      return <TerminalAnimation />;
    }
    if (error && !markdown) { // Only show full-screen error if there's no markdown to display
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Generation Failed</h3>
                <p className="text-red-300/80 text-sm">{error}</p>
            </div>
        </div>
      );
    }
    if (markdown) {
      if (activeTab === 'preview') {
        return (
            <div className="markdown-preview p-6 w-full">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      img: ({ node, ...props }) => <img {...props} alt={props.alt || ''} style={{backgroundColor: 'transparent'}}/>,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                >
                    {markdown}
                </ReactMarkdown>
            </div>
        );
      }
      return (
        <SyntaxHighlighter language="markdown" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: 'transparent', width: '100%', height: '100%' }} codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' } }} wrapLongLines={true}>
          {markdown}
        </SyntaxHighlighter>
      );
    }
    return (
      <div className="text-center text-gray-600 flex flex-col items-center justify-center h-full p-4">
        <p className="text-lg">Your generated masterpiece will appear here.</p>
        <p className="text-sm mt-1">Describe an idea and click "Generate".</p>
      </div>
    );
  };
  
  const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        {children}
    </button>
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const showChat = isChatModeEnabled && (markdown || chatHistory.length > 0);

  return (
    <div ref={outputContainerRef} className="bg-[#0A0A0A]/60 border border-white/10 rounded-lg shadow-2xl flex flex-col h-full backdrop-blur-md">
      <style>{`
          .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { color: #E5E7EB; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; margin: 1.5em 0 1em; }
          .markdown-preview h1 { font-size: 2em; } .markdown-preview h2 { font-size: 1.5em; } .markdown-preview h3 { font-size: 1.25em; }
          .markdown-preview p { line-height: 1.6; margin-bottom: 1em; color: #D1D5DB; }
          .markdown-preview a { color: #60A5FA; text-decoration: none; } .markdown-preview a:hover { text-decoration: underline; }
          .markdown-preview code { background-color: rgba(255,255,255,0.1); color: #E5E7EB; padding: .2em .4em; margin: 0; font-size: 85%; border-radius: 6px; }
          .markdown-preview pre { background-color: #000000; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; margin-bottom: 1em; }
          .markdown-preview pre code { padding: 0; background-color: transparent; }
          .markdown-preview img { max-width: 100%; height: auto; display: block; margin: 1em auto; background-color: transparent; border-radius: 0.5rem; }
          .markdown-preview ul, .markdown-preview ol { padding-left: 2em; margin-bottom: 1em; color: #D1D5DB; }
          .markdown-preview blockquote { padding: 0 1em; color: #9CA3AF; border-left: 0.25em solid #4B5563; margin-bottom: 1em; }
          .blinking-cursor { animation: blink 1s step-end infinite; }
          @keyframes blink { from, to { color: transparent; } 50% { color: inherit; } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        `}</style>
      <div className="flex justify-between items-center p-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 p-1 bg-black/30 rounded-lg">
          <TabButton isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')}><EyeIcon /> Preview</TabButton>
          <TabButton isActive={activeTab === 'code'} onClick={() => setActiveTab('code')}><CodeIcon /> Code</TabButton>
        </div>
        
        {markdown && !isLoading && (
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
                <Tooltip text="Undo (Ctrl+Z)">
                    <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><UndoIcon /></button>
                </Tooltip>
                 <Tooltip text="Redo (Ctrl+Y)">
                    <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><RedoIcon /></button>
                </Tooltip>
              </div>
            <Tooltip text="Copy Markdown Code" position="left">
              <button onClick={handleCopy} className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 transition text-gray-300 flex items-center gap-2 text-sm border border-white/10" aria-label="Copy markdown">
                <ClipboardIcon /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      
      <div className="relative flex-grow min-h-0 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full overflow-auto custom-scrollbar">{renderContent()}</div>
      </div>
      
       {showChat && (
        <>
        <div 
            className="w-full h-1.5 bg-white/10 cursor-row-resize hover:bg-blue-500 transition-colors duration-200 flex-shrink-0"
            onMouseDown={handleChatResizeMouseDown}
          ></div>
        <ChatPanel
          height={chatHeight}
          chatHistory={chatHistory}
          isRefining={isRefining}
          error={error}
          onSendMessage={onSendMessage}
          onApplyCode={onApplyCode}
          markdown={markdown}
        />
        </>
       )}
    </div>
  );
};