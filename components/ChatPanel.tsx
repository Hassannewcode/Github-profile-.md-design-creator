import React, { useState, useEffect, useRef } from 'react';
import { SendIcon } from './icons/SendIcon';
import { CheckIcon } from './icons/CheckIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';

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
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatHistory,
  isRefining,
  error,
  onSendMessage,
  onApplyCode,
  markdown,
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

  return (
    <div className="p-3 border-t border-white/10 bg-black/30 rounded-b-lg flex-shrink-0 flex flex-col max-h-[40%]">
      {error && <p className="text-xs text-red-400 mb-2 px-2 text-center">{error}</p>}
      <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto p-2 pr-4 custom-scrollbar">
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
      <form onSubmit={handleChatSubmit} className="mt-2 flex-shrink-0">
        <div className="relative">
          <input
            id="chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isRefining ? "AI is thinking..." : "Refine your design, e.g., 'make it dark blue'..."}
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
  );
};
