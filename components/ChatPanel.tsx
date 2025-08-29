import React, { useState, useEffect, useRef } from 'react';
import { SendIcon } from './icons/SendIcon';
import { CheckIcon } from './icons/CheckIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { Tooltip } from './Tooltip';
import { RefreshIcon } from './icons/RefreshIcon';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  markdown?: string;
  id: number;
}

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  isRefining: boolean;
  error: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onApplyCode: (markdown: string) => void;
  markdown: string;
  onRefreshChat: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatHistory,
  isRefining,
  error,
  onSendMessage,
  onApplyCode,
  markdown,
  onRefreshChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isRefining]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isRefining) {
      try {
        await onSendMessage(chatInput);
      } finally {
        setChatInput('');
      }
    }
  };

  const hasChatStarted = chatHistory.length > 0 || isRefining;

  const getPlaceholderText = () => {
    if (isRefining) return "AI is thinking...";
    if (markdown) return "e.g., 'Make the animation faster'";
    return "Generate some code first to start chatting...";
  };

  return (
    <div className="bg-[#0A0A0A]/60 border border-white/10 rounded-lg shadow-2xl h-full flex flex-col backdrop-blur-md">
      <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
        <div>
            <h2 className="text-md font-semibold text-gray-100">AI Co-pilot</h2>
            <p className="text-sm text-gray-400">Refine your code.</p>
        </div>
        <Tooltip text="Refresh Chat">
            <button
                onClick={onRefreshChat}
                disabled={isRefining}
                className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh chat"
            >
                <RefreshIcon />
            </button>
        </Tooltip>
      </div>
      
      {!hasChatStarted ? (
        <div className="flex-grow flex items-center justify-center text-center text-gray-500 p-4">
          <p>Generate some code first, then you can chat with the AI here to make changes.</p>
        </div>
      ) : (
        <>
            <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto p-3 custom-scrollbar">
                {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-200'}`}>
                    {msg.sender === 'ai' && !msg.text && isRefining ? (
                        <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                    ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    )}
                    {msg.markdown && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                        <button
                            onClick={() => onApplyCode(msg.markdown!)}
                            disabled={markdown === msg.markdown || isRefining}
                            className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-white/10 px-3 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
                        >
                            {markdown === msg.markdown ? <><CheckIcon /> Applied</> : <><RefreshCwIcon /> Apply Changes</>}
                        </button>
                        </div>
                    )}
                    </div>
                </div>
                ))}
            </div>
            <div className="p-3 border-t border-white/10 flex-shrink-0">
                {error && <p className="text-xs text-red-400 mb-2 text-center">{error}</p>}
                <form onSubmit={handleChatSubmit}>
                    <div className="relative">
                    <input
                        id="chat-input"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={getPlaceholderText()}
                        disabled={isRefining || !markdown}
                        className="w-full bg-black/50 border border-white/10 rounded-md p-2.5 pr-12 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50"
                        autoComplete="off"
                    />
                    <button type="submit" disabled={isRefining || !chatInput.trim() || !markdown} className="absolute right-1.5 top-1/5 flex items-center justify-center h-8 w-8 -translate-y-1/8 bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" aria-label="Send message" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                        <SendIcon />
                    </button>
                    </div>
                </form>
            </div>
        </>
      )}
    </div>
  );
};
