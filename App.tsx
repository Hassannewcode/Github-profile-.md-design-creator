

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Output } from './components/Output';
import { sanitizeContent } from './utils/privacy';

const SYSTEM_INSTRUCTION = `You are an elite programmer and technical writer. Your sole purpose is to transform user ideas into single, self-contained, and clean code snippets formatted in Markdown for GitHub profile READMEs.

**CRITICAL REQUIREMENTS:**
1.  **Output Markdown Code Block ONLY:** Your entire code output must be a raw Markdown fenced code block. Do not include any explanations, greetings, or apologies outside the special response format. Your output must be immediately usable.
2.  **Language Selection:**
    *   A 'Language' parameter will be provided. It can be 'Auto' or a specific language (e.g., 'JavaScript', 'Python').
    *   If **Language** is **'Auto'**: You MUST analyze the user's prompt and choose the most appropriate programming language for the task. State which language you chose in your conversational response.
    *   If a **specific language** is provided: You MUST generate the code in that exact language.
3.  **Code Quality:** The code must be clean, efficient, well-commented, and follow best practices for the chosen language.
4.  **Self-Contained:** The snippet should be self-contained and easy to understand. Avoid complex dependencies unless requested.
5.  **Refinement Protocol:** When asked for changes, you MUST modify the previous code you generated. Output the complete, new, raw Markdown code block with the requested refinements.

**NEW: Chat Interaction Protocol:**
1.  **Conversational Assistant:** You are a conversational assistant. Engage with the user in a friendly and helpful tone. Your goal is to collaboratively create the perfect code snippet.
2.  **Code Generation Command:** When the user asks you to generate or modify code, you MUST respond with two parts in this exact order:
    1.  A friendly, conversational message explaining what you did (e.g., "Certainly! I've written that in Python for you, including comments explaining each step. Here is the code:").
    2.  The complete, raw Markdown code, enclosed in a special \`<markdown_code>\` tag.
3.  **CRITICAL Code Tag:** The entire raw Markdown output MUST be wrapped in \`<markdown_code>...</markdown_code>\`. The application relies on this exact tag to parse your response. The content inside MUST be a valid Markdown fenced code block.
    *   **Correct Example:**
        Of course! Here is a simple sorting function in JavaScript:
        <markdown_code>
        \`\`\`javascript
        function bubbleSort(arr) {
          let n = arr.length;
          for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < n - i - 1; j++) {
              if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
              }
            }
          }
          return arr;
        }
        \`\`\`
        </markdown_code>
    *   **Incorrect Example:**
        \`\`\`
        function bubbleSort...
        \`\`\`
4.  **Always Provide Full Code:** Every time you provide code, it must be the complete, self-contained, and final Markdown snippet. Do not provide diffs or partial code.

**GitHub Token Usage:**
If a GitHub token is provided, you may use it for API calls (e.g., fetching user data to use in a script).
**CRITICAL SECURITY RULE:** NEVER, under any circumstances, expose the user's token in the generated output. Do not embed it in URLs, comments, or any part of the Markdown.`;

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.message.includes('SAFETY')) {
            return 'The request was blocked for safety reasons. Please adjust your prompt to be less specific about people or sensitive topics and try again.';
        }
        if (error.message.includes('fetch')) {
            return 'A network error occurred. Please check your connection and try again.';
        }
    }
    console.error(error);
    return 'Failed to generate README. The AI might be busy, the request may be too complex, or an unsupported feature was requested. Please try again with a simpler idea.';
};

const LOCAL_STORAGE_KEY = 'readmeGeneratorConfig_v3';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  markdown?: string;
  id: number;
}

// Load state from localStorage on initial render
const loadState = () => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.warn("Could not load state from localStorage", err);
    return undefined;
  }
};

const App: React.FC = () => {
  const savedState = useRef(loadState());

  const [userPrompt, setUserPrompt] = useState<string>(savedState.current?.prompt || '');
  const [githubToken, setGithubToken] = useState<string>(savedState.current?.githubToken || '');
  const [markdown, setMarkdown] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(savedState.current?.chatHistory || []);
  const [markdownHistory, setMarkdownHistory] = useState<string[]>(['']);
  const [markdownHistoryIndex, setMarkdownHistoryIndex] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatInstance = useRef<Chat | null>(null);
  const [isChatModeEnabled, setIsChatModeEnabled] = useState<boolean>(savedState.current?.isChatModeEnabled ?? true);
  const [language, setLanguage] = useState<string>(savedState.current?.language || 'auto');
  
  // Resizable panel logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(450);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
        const newWidth = e.clientX - containerRef.current.offsetLeft;
        if (newWidth > 380 && newWidth < containerRef.current.clientWidth - 450) {
            setPanelWidth(newWidth);
        }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      prompt: userPrompt,
      githubToken,
      isChatModeEnabled,
      language,
      chatHistory,
    };
    try {
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.warn("Could not save state to localStorage", err);
    }
  }, [userPrompt, githubToken, isChatModeEnabled, language, chatHistory]);


  useEffect(() => {
    if (githubToken.trim() && markdown) {
      const sanitized = sanitizeContent(markdown, githubToken);
      if (sanitized !== markdown) {
        setMarkdown(sanitized);
      }
    }
  }, [markdown, githubToken]);

  const updateHistory = (newMarkdown: string) => {
    const newHistory = markdownHistory.slice(0, markdownHistoryIndex + 1);
    newHistory.push(newMarkdown);
    setMarkdownHistory(newHistory);
    setMarkdownHistoryIndex(newHistory.length - 1);
    setMarkdown(newMarkdown);
  };
  
  const handleUndo = useCallback(() => {
    if (markdownHistoryIndex > 0) {
      const newIndex = markdownHistoryIndex - 1;
      setMarkdownHistoryIndex(newIndex);
      setMarkdown(markdownHistory[newIndex]);
    }
  }, [markdownHistory, markdownHistoryIndex]);

  const handleRedo = useCallback(() => {
    if (markdownHistoryIndex < markdownHistory.length - 1) {
      const newIndex = markdownHistoryIndex + 1;
      setMarkdownHistoryIndex(newIndex);
      setMarkdown(markdownHistory[newIndex]);
    }
  }, [markdownHistory, markdownHistoryIndex]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const undoPressed = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
      const redoPressed = (isMac && e.metaKey && e.shiftKey && e.key === 'z') || (!isMac && e.ctrlKey && e.key === 'y');

      if (undoPressed) {
        e.preventDefault();
        handleUndo();
      } else if (redoPressed) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  const handleResetSettings = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUserPrompt('');
    setGithubToken('');
    setIsChatModeEnabled(true);
    setLanguage('auto');
    setChatHistory([]);
  };
  
  const handleApplyCode = (newMarkdown: string) => {
    updateHistory(newMarkdown);
  };
  
  const parseAIResponse = (responseText: string): { text: string; markdown?: string } => {
    const codeRegex = /<markdown_code>([\s\S]*?)<\/markdown_code>/;
    const match = responseText.match(codeRegex);

    if (match && match[1]) {
      const markdown = match[1].trim();
      const text = responseText.replace(codeRegex, '').trim();
      return { text, markdown };
    }

    return { text: responseText };
  };

  const buildPrompt = (currentPrompt: string): string => {
    let finalPrompt = `Language: '${language}'.\nUser's idea: "${currentPrompt}".`;
    
    if (githubToken.trim()) {
      finalPrompt += `\n\nUse this GitHub PAT for API calls if needed: ${githubToken}. REMEMBER: DO NOT expose this token in the output.`;
    }
    return finalPrompt;
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of what you want to create.');
      return;
    }
    setIsStreaming(true);
    setError(null);
    setMarkdown('');
    setChatHistory([]);
    let streamedResponse = '';
    
    const userMessage: ChatMessage = {
      sender: 'user',
      text: userPrompt,
      id: Date.now(),
    };
    setChatHistory([userMessage]);

    try {
      const finalPrompt = buildPrompt(userPrompt);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      chatInstance.current = isChatModeEnabled ? newChat : null;

      const responseStream = isChatModeEnabled
        ? await newChat.sendMessageStream({ message: finalPrompt })
        : await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: finalPrompt,
            config: { systemInstruction: SYSTEM_INSTRUCTION },
          });

      const aiMessageId = Date.now() + 1;
      const aiPlaceholder: ChatMessage = {
          sender: 'ai',
          text: '',
          id: aiMessageId,
      };
      setChatHistory(prev => [...prev, aiPlaceholder]);

      for await (const chunk of responseStream) {
        const text = chunk.text ?? '';
        streamedResponse += text;
        setChatHistory(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: streamedResponse } : msg
        ));
      }

      const { text: aiText, markdown: newMarkdown } = parseAIResponse(streamedResponse);
      
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, text: aiText, markdown: newMarkdown } : msg
      ));

      if (newMarkdown) {
        updateHistory(newMarkdown);
      } else if (!aiText) {
          setError("The AI didn't return any content. Try rephrasing your idea.");
      }

    } catch (err) {
      setError(getErrorMessage(err));
      setChatHistory(prev => prev.filter(msg => msg.sender === 'user'));
    } finally {
      setIsStreaming(false);
    }
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !chatInstance.current) {
      return;
    }
    setIsStreaming(true);
    setError(null);
    let streamedResponse = '';

    const userMessage: ChatMessage = {
      sender: 'user',
      text: message,
      id: Date.now(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const finalPrompt = buildPrompt(message);
      const responseStream = await chatInstance.current.sendMessageStream({ message: finalPrompt });
      
      const aiMessageId = Date.now() + 1;
      const aiPlaceholder: ChatMessage = {
          sender: 'ai',
          text: '',
          id: aiMessageId,
      };
      setChatHistory(prev => [...prev, aiPlaceholder]);

      for await (const chunk of responseStream) {
        const text = chunk.text ?? '';
        streamedResponse += text;
        setChatHistory(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: streamedResponse } : msg
        ));
      }
      
      const { text: aiText, markdown: newMarkdown } = parseAIResponse(streamedResponse);
      
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, text: aiText, markdown: newMarkdown } : msg
      ));

    } catch(err) {
      setError(getErrorMessage(err));
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div ref={containerRef} className="h-screen text-gray-300 font-sans flex flex-col p-4 gap-4">
      <Header />
      <main className="flex-grow grid grid-cols-[auto,1fr] gap-4 min-h-0">
        <div style={{ width: `${panelWidth}px` }} className="flex flex-col min-w-[380px] min-h-0">
          <Controls
            prompt={userPrompt}
            setPrompt={setUserPrompt}
            githubToken={githubToken}
            setGithubToken={setGithubToken}
            onGenerate={handleGenerate}
            isLoading={isStreaming}
            isChatModeEnabled={isChatModeEnabled}
            setIsChatModeEnabled={setIsChatModeEnabled}
            language={language}
            setLanguage={setLanguage}
            onReset={handleResetSettings}
          />
        </div>
        
        <div 
            className="absolute top-1/2 -translate-y-1/2 h-24 w-1.5 bg-white/5 rounded-full cursor-col-resize hover:bg-blue-500 transition-colors duration-200 z-20"
            style={{ left: `${panelWidth - 3}px` }}
            onMouseDown={handleMouseDown}
        ></div>

        <div className="flex flex-col min-w-0">
          <Output 
            markdown={markdown} 
            isLoading={isStreaming} 
            error={error} 
            onSendMessage={handleSendMessage}
            isRefining={isStreaming}
            isChatModeEnabled={isChatModeEnabled}
            historyIndex={markdownHistoryIndex}
            historyLength={markdownHistory.length}
            onUndo={handleUndo}
            onRedo={handleRedo}
            chatHistory={chatHistory}
            onApplyCode={handleApplyCode}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
