import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Output } from './components/Output';
import { ChatPanel } from './components/ChatPanel';

const SYSTEM_INSTRUCTION = `You are a world-class GitHub Profile README designer. Your purpose is to collaborate with users to create stunning, modern, and engaging profile READMEs. You are an expert in GitHub-flavored Markdown, creative ASCII art, embedding dynamic content, and using HTML for advanced layouts.

**CRITICAL REQUIREMENTS:**

1.  **Markdown First:** Your primary output must always be a complete, self-contained, and ready-to-use \`README.md\` file.
2.  **Language Theming:** The user will select their "Primary Languages" (e.g., "TypeScript", "Go", "Rust"). You MUST use these as the central theme. This influences the choice of icons, examples, and the overall technical focus of the profile.
3.  **Dynamic & Animated Content:** You MUST incorporate a variety of dynamic and animated elements to make the profile stand out. This is essential.
    *   **GitHub Stats Cards:** You MUST include BOTH a general stats card AND a top languages card from \`github-readme-stats\` (e.g., \`https://github-readme-stats.vercel.app/api?username=...\` and \`.../api/top-langs?username=...\`). Theme them with a modern dark theme (e.g., \`theme=tokyonight\`, \`theme=dracula\`, or \`theme=github_dark\`).
    *   **Animated Contribution Graph:** Suggest or include an animated contribution graph, like the GitHub contributions snake (e.g., from \`github-contribution-grid-snake.svg\`).
    *   **Tech Stack Icons:** Use services like \`img.shields.io\` or simple-icons to visually display technologies. Prioritize icons for the user's selected "Primary Languages".
    *   **Animations:** Suggest or embed other relevant animated GIFs or SVGs (e.g., a typing animation for an intro).
4.  **Structure & Content:** Generate a well-structured profile based on the user's prompt. Common sections include: an intro/header, "About Me," "Tech Stack," "GitHub Stats," and "Contact Me."
5.  **Refinement Protocol:** When the user asks for changes (e.g., "add a section for my latest blog posts," "change the stats theme to dracula"), you MUST modify the previous README you generated. Output the complete, new \`README.md\` file with the requested refinements.

**NEW: Chat Interaction Protocol:**

1.  **Conversational Partner:** Engage with the user in a creative, helpful, and slightly enthusiastic tone. You're their personal profile designer.
2.  **Generation Command:** When the user asks you to generate or modify a README, you MUST respond with two parts in this exact order:
    1.  A short, encouraging message explaining your design choices (e.g., "Awesome! I've crafted a profile themed around TypeScript and Go, featuring animated stats and a skills section. Here is your README.md file:").
    2.  The complete, raw Markdown code, enclosed in a special \`<markdown_code>\` tag. This is critical for the app to parse your response.
3.  **CRITICAL Code Tag & Format:** The entire raw Markdown code output MUST be wrapped in \`<markdown_code>...</markdown_code>\`.
    *   **DO NOT** wrap the content inside the tag with triple backticks (\`\`\`). Provide the raw markdown directly.
    *   **Correct Example:**
        Here's a slick 'TypeScript' themed design for you!
        <markdown_code>
        ### Hi there 👋
        I'm a full-stack developer specializing in TypeScript!
        &nbsp;
        ![My Stats](https://github-readme-stats.vercel.app/api?username=USERNAME&theme=tokyonight&show_icons=true)
        </markdown_code>
4.  **Always Provide Full Code:** Every time you provide code, it must be the complete, self-contained README. Do not provide diffs or partial code.`;

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.message.includes('SAFETY')) {
            return 'The request was blocked for safety reasons. Please adjust your prompt and try again.';
        }
        if (error.message.includes('fetch')) {
            return 'A network error occurred. Please check your connection and try again.';
        }
    }
    console.error(error);
    return 'Failed to generate code. The AI might be busy or the request may be too complex. Try again with a simpler idea.';
};

const LOCAL_STORAGE_KEY = 'githubProfileDesignerConfig_v1';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  markdown?: string;
  id: number;
}

interface GenerationHistoryItem {
    id: number;
    markdown: string;
    preview: string;
    timestamp: string;
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
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(savedState.current?.selectedLanguages || []);
  const [githubToken, setGithubToken] = useState<string>(savedState.current?.githubToken || '');
  const [markdown, setMarkdown] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(savedState.current?.chatHistory || []);
  const [markdownHistory, setMarkdownHistory] = useState<string[]>(['']);
  const [markdownHistoryIndex, setMarkdownHistoryIndex] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatInstance = useRef<Chat | null>(null);
  const [isChatModeEnabled, setIsChatModeEnabled] = useState<boolean>(savedState.current?.isChatModeEnabled ?? true);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>(savedState.current?.generationHistory || []);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);

  // Resizable panel logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);

  const handleLeftMouseDown = useCallback(() => setIsResizingLeft(true), []);
  const handleRightMouseDown = useCallback(() => setIsResizingRight(true), []);
  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const minCenterWidth = 450;
    const effectiveRightPanelWidth = isChatModeEnabled ? rightPanelWidth : 0;

    if (isResizingLeft) {
      const newWidth = e.clientX - containerRect.left;
      const maxLeftWidth = containerRect.width - effectiveRightPanelWidth - minCenterWidth;
      if (newWidth > 380 && newWidth < maxLeftWidth) {
        setLeftPanelWidth(newWidth);
      }
    } else if (isResizingRight && isChatModeEnabled) {
      const newWidth = containerRect.right - e.clientX;
      const maxRightWidth = containerRect.width - leftPanelWidth - minCenterWidth;
      if (newWidth > 350 && newWidth < maxRightWidth) {
        setRightPanelWidth(newWidth);
      }
    }
  }, [isResizingLeft, isResizingRight, leftPanelWidth, rightPanelWidth, isChatModeEnabled]);

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
      selectedLanguages,
      isChatModeEnabled,
      chatHistory,
      generationHistory,
      githubToken,
    };
    try {
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.warn("Could not save state to localStorage", err);
    }
  }, [userPrompt, selectedLanguages, isChatModeEnabled, chatHistory, generationHistory, githubToken]);

  const updateMarkdownState = (newMarkdown: string) => {
    // 1. Update main markdown content
    setMarkdown(newMarkdown);
    
    // 2. Update undo/redo stack
    const newUndoHistory = markdownHistory.slice(0, markdownHistoryIndex + 1);
    newUndoHistory.push(newMarkdown);
    setMarkdownHistory(newUndoHistory);
    setMarkdownHistoryIndex(newUndoHistory.length - 1);
    
    // 3. Create and add a new generation history item
    const newHistoryId = Date.now();
    const newHistoryItem: GenerationHistoryItem = {
        id: newHistoryId,
        markdown: newMarkdown,
        preview: newMarkdown.split('\n')[0].replace(/#+\s*/, '').slice(0, 50) || 'Untitled README',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setGenerationHistory(prev => [newHistoryItem, ...prev]);
    setActiveHistoryId(newHistoryId);
  };
  
  const handleUndo = useCallback(() => {
    if (markdownHistoryIndex > 0) {
      const newIndex = markdownHistoryIndex - 1;
      setMarkdownHistoryIndex(newIndex);
      setMarkdown(markdownHistory[newIndex]);
      setActiveHistoryId(null); // Deselect history item when undoing
    }
  }, [markdownHistory, markdownHistoryIndex]);

  const handleRedo = useCallback(() => {
    if (markdownHistoryIndex < markdownHistory.length - 1) {
      const newIndex = markdownHistoryIndex + 1;
      setMarkdownHistoryIndex(newIndex);
      setMarkdown(markdownHistory[newIndex]);
      setActiveHistoryId(null); // Deselect history item when redoing
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
  
  const handleApplyCode = (newMarkdown: string) => {
    updateMarkdownState(newMarkdown);
  };
  
  const handleSelectHistory = (id: number) => {
    const selectedItem = generationHistory.find(item => item.id === id);
    if (selectedItem) {
        setMarkdown(selectedItem.markdown);
        // Reset undo/redo stack for the selected item
        setMarkdownHistory(['', selectedItem.markdown]);
        setMarkdownHistoryIndex(1);
        setActiveHistoryId(id);
    }
  };

  const handleClearHistory = () => {
      setGenerationHistory([]);
      setActiveHistoryId(null);
  };
  
  const handleNewTask = () => {
    setUserPrompt('');
    setMarkdown('');
    setChatHistory([]);
    setMarkdownHistory(['']);
    setMarkdownHistoryIndex(0);
    chatInstance.current = null;
    setActiveHistoryId(null);
    setError(null);
  };

  const handleRefreshChat = () => {
    setChatHistory([]);
    setError(null);
    chatInstance.current = null; // This will force re-initialization on next message
  };

  const handleResetSettings = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    handleNewTask();
    setSelectedLanguages([]);
    setGithubToken('');
    setIsChatModeEnabled(true);
    setGenerationHistory([]);
  };
  
  const parseAIResponse = (responseText: string): { text: string; markdown?: string } => {
    const codeRegex = /<markdown_code>([\s\S]*?)<\/markdown_code>/s;
    const match = responseText.match(codeRegex);

    if (match && match[1]) {
      const markdown = match[1].trim();
      const text = responseText.replace(codeRegex, '').trim();
      return { text, markdown };
    }

    const openTag = '<markdown_code>';
    const openTagIndex = responseText.indexOf(openTag);

    if (openTagIndex !== -1) {
      console.warn("AI response parsing: Found an opening <markdown_code> tag without a valid closing tag. Attempting to recover markdown content.");
      const text = responseText.substring(0, openTagIndex).trim();
      let markdown = responseText.substring(openTagIndex + openTag.length);
      
      const closeTag = '</markdown_code>';
      if (markdown.trim().endsWith(closeTag)) {
          markdown = markdown.trim().slice(0, -closeTag.length);
      }
      return { text, markdown: markdown.trim() };
    }

    const trimmedResponse = responseText.trim();
    const isLikelyMarkdown = 
      (trimmedResponse.match(/```/g) || []).length >= 2 || trimmedResponse.startsWith('#');

    if (isLikelyMarkdown) {
      console.warn("AI response parsing: Response appears to be markdown but is missing <markdown_code> tags. Treating the entire response as markdown.");
      return { text: '', markdown: trimmedResponse };
    }

    return { text: responseText.trim() };
  };

  const buildPrompt = (currentPrompt: string, isFollowUp: boolean): string => {
    let finalPrompt;
    const tokenInfo = githubToken.trim() ? " The user has provided a GitHub token, so please include private contribution counts and other enhanced stats where possible." : "";
    const languageInfo = selectedLanguages.length > 0 ? ` The profile should be themed around and highlight the following programming languages: ${selectedLanguages.join(', ')}.` : "";

    if (isFollowUp && !chatInstance.current && markdown) {
        finalPrompt = `Based on the following README.md file, please apply the user's request.\n\n<markdown_code>\n${markdown}\n</markdown_code>\n\nUser's request: "${currentPrompt}"${tokenInfo}${languageInfo}`;
    } else {
        finalPrompt = `User's profile description: "${currentPrompt}". Please generate a GitHub profile README for it.${languageInfo}${tokenInfo}`;
    }
    
    return finalPrompt;
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please describe the profile you want to create.');
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
      const finalPrompt = buildPrompt(userPrompt, false);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
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
        const text = chunk.text;
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
        updateMarkdownState(newMarkdown);
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
    if (!message.trim()) {
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
      if (!chatInstance.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatInstance.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
      }

      const finalPrompt = buildPrompt(message, true);
      const responseStream = await chatInstance.current.sendMessageStream({ message: finalPrompt });
      
      const aiMessageId = Date.now() + 1;
      const aiPlaceholder: ChatMessage = {
          sender: 'ai',
          text: '',
          id: aiMessageId,
      };
      setChatHistory(prev => [...prev, aiPlaceholder]);

      for await (const chunk of responseStream) {
        const text = chunk.text;
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

  const gridTemplateColumns = isChatModeEnabled
    ? `${leftPanelWidth}px 1fr ${rightPanelWidth}px`
    : `${leftPanelWidth}px 1fr 0px`;
  
  return (
    <div ref={containerRef} className="h-screen text-gray-300 font-sans flex flex-col p-4 gap-4" style={{ gridTemplateColumns }}>
      <Header />
      <main className="flex-grow grid grid-cols-[auto,1fr,auto] gap-4 min-h-0 relative">
        {/* Left Panel */}
        <div style={{ width: `${leftPanelWidth}px` }} className="flex flex-col min-w-[380px] min-h-0">
          <Controls
            prompt={userPrompt}
            setPrompt={setUserPrompt}
            selectedLanguages={selectedLanguages}
            setSelectedLanguages={setSelectedLanguages}
            githubToken={githubToken}
            setGithubToken={setGithubToken}
            onGenerate={handleGenerate}
            isLoading={isStreaming}
            isChatModeEnabled={isChatModeEnabled}
            setIsChatModeEnabled={setIsChatModeEnabled}
            onReset={handleResetSettings}
            onNewTask={handleNewTask}
            generationHistory={generationHistory}
            activeHistoryId={activeHistoryId}
            onSelectHistory={handleSelectHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
        
        {/* Left Resizer */}
        <div 
            className="absolute top-1/2 -translate-y-1/2 h-24 w-1.5 bg-white/5 rounded-full cursor-col-resize hover:bg-blue-500 transition-colors duration-200 z-20"
            style={{ left: `${leftPanelWidth - 3}px` }}
            onMouseDown={handleLeftMouseDown}
            aria-hidden="true"
        ></div>

        {/* Center Panel */}
        <div className="flex flex-col min-w-0">
          <Output 
            markdown={markdown} 
            isLoading={isStreaming && chatHistory.length <= 1}
            error={error} 
            historyIndex={markdownHistoryIndex}
            historyLength={markdownHistory.length}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>

        {/* Right Resizer and Panel */}
        {isChatModeEnabled && (
          <>
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-24 w-1.5 bg-white/5 rounded-full cursor-col-resize hover:bg-blue-500 transition-colors duration-200 z-20"
              style={{ right: `${rightPanelWidth - 3}px` }}
              onMouseDown={handleRightMouseDown}
              aria-hidden="true"
            ></div>

            <div style={{ width: `${rightPanelWidth}px` }} className="flex flex-col min-w-[350px] min-h-0">
              <ChatPanel
                chatHistory={chatHistory}
                isRefining={isStreaming}
                error={error}
                onSendMessage={handleSendMessage}
                onApplyCode={handleApplyCode}
                markdown={markdown}
                onRefreshChat={handleRefreshChat}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
