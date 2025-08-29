import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Output } from './components/Output';
import { ChatPanel } from './components/ChatPanel';
import { sanitizeContent } from './utils/privacy';

// FIX: Replaced the multiline string to fix potential syntax errors from hidden characters or improper formatting.
const SYSTEM_INSTRUCTION = `You are an expert technical writer and developer advocate specializing in creating stunning, professional, and engaging GitHub profile READMEs. Your goal is to transform a user's description of themselves into a complete, well-structured, and visually appealing Markdown file. The user is creating a .md file, so ensure all output is valid GitHub-flavored Markdown.

**CRITICAL REQUIREMENTS:**
1.  **Output Full Markdown ONLY:** Your entire output must be the raw Markdown for the README file. Do not include any explanations, greetings, or apologies outside the special response format. Your output must be immediately usable.
2.  **Structure and Readability:**
    *   Generate a well-organized README. Use sections like "Hi there 👋", "About Me", "My Tech Stack", "My Projects", "Connect with me", etc.
    *   Enhance readability using emojis, lists, bold text, and other Markdown formatting to make the profile scannable and engaging.
3.  **Use Badges:** You MUST incorporate relevant and stylish badges from shields.io (or similar services) to showcase skills, social media, stats, etc. For example, use \`https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black\`.
4.  **Refinement Protocol:** When asked for changes, you MUST modify the previous README you generated. Output the complete, new, raw Markdown file with the requested refinements.

**NEW: Chat Interaction Protocol:**
1.  **Conversational Assistant:** You are a conversational assistant. Engage with the user in a friendly and helpful tone. Your goal is to collaboratively create the perfect README.
2.  **Markdown Generation Command:** When the user asks you to generate or modify the README, you MUST respond with two parts in this exact order:
    1.  A friendly, conversational message explaining what you did (e.g., "Certainly! I've drafted a professional README for you, including skill badges and a project section. Here it is:").
    2.  The complete, raw README Markdown, enclosed in a special \`<markdown_code>\` tag.
3.  **CRITICAL Code Tag:** The entire raw Markdown output MUST be wrapped in \`<markdown_code>...</markdown_code>\`. The application relies on this exact tag to parse your response.
    *   **Correct Example:**
        Of course! Here is a README to get you started:
        <markdown_code>
        # Hi there, I'm Jane! 👋

        ## 👩‍💻 About Me
        I'm a passionate full-stack developer...

        ## 🛠️ My Tech Stack
        ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
        ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
        </markdown_code>
    *   **Incorrect Example:**
        # Hi there, I'm Jane! 👋
        ...
4.  **Always Provide Full Code:** Every time you provide Markdown, it must be the complete, self-contained, and final README. Do not provide diffs or partial code.

**GitHub Token Usage:**
If a GitHub token is provided, you may use it for API calls (e.g., fetching user data to use in the README).
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

const LOCAL_STORAGE_KEY = 'readmeGeneratorConfig_v4';

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
      githubToken,
      isChatModeEnabled,
      chatHistory,
      generationHistory,
    };
    try {
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.warn("Could not save state to localStorage", err);
    }
  }, [userPrompt, githubToken, isChatModeEnabled, chatHistory, generationHistory]);


  useEffect(() => {
    if (githubToken.trim() && markdown) {
      const sanitized = sanitizeContent(markdown, githubToken);
      if (sanitized !== markdown) {
        setMarkdown(sanitized);
      }
    }
  }, [markdown, githubToken]);

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
        preview: newMarkdown.split('\n')[0].replace(/#+\s*/, '').slice(0, 50) || 'Untitled',
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
    setGithubToken('');
    setIsChatModeEnabled(true);
    setGenerationHistory([]);
  };
  
  const parseAIResponse = (responseText: string): { text: string; markdown?: string } => {
    const codeRegex = /<markdown_code>([\s\S]*?)<\/markdown_code>/s;
    const match = responseText.match(codeRegex);

    // Case 1: Perfect match found. This is the ideal path.
    if (match && match[1]) {
      const markdown = match[1].trim();
      // The text is whatever is left after removing the markdown block.
      const text = responseText.replace(codeRegex, '').trim();
      return { text, markdown };
    }

    // Case 2: No perfect match. Let's try to recover from malformed tags.
    const openTag = '<markdown_code>';
    const openTagIndex = responseText.indexOf(openTag);

    if (openTagIndex !== -1) {
      // An opening tag exists, but the closing tag is missing or malformed.
      console.warn("AI response parsing: Found an opening <markdown_code> tag without a valid closing tag. Attempting to recover markdown content.");
      
      const text = responseText.substring(0, openTagIndex).trim();
      let markdown = responseText.substring(openTagIndex + openTag.length);
      
      // Also attempt to trim a trailing closing tag if it exists.
      const closeTag = '</markdown_code>';
      if (markdown.trim().endsWith(closeTag)) {
          markdown = markdown.trim().slice(0, -closeTag.length);
      }
      
      return { text, markdown: markdown.trim() };
    }

    // Case 3: No tags at all. Heuristically check if the response is *only* markdown.
    const trimmedResponse = responseText.trim();
    // A simple heuristic: check for common markdown starting patterns or elements.
    const isLikelyMarkdown = 
      trimmedResponse.startsWith('#') || 
      (trimmedResponse.match(/```/g) || []).length >= 2; // Contains a fenced code block

    if (isLikelyMarkdown) {
      console.warn("AI response parsing: Response appears to be markdown but is missing <markdown_code> tags. Treating the entire response as markdown.");
      // Assume no conversational text in this case.
      return { text: '', markdown: trimmedResponse };
    }

    // Case 4: If all else fails, treat the entire response as conversational text.
    return { text: responseText.trim() };
  };

  const buildPrompt = (currentPrompt: string, isFollowUp: boolean): string => {
    let finalPrompt;

    if (isFollowUp && !chatInstance.current && markdown) {
        // This is the first message after a chat refresh. Provide context.
        finalPrompt = `Based on the following README, please apply the user's request. The user wants you to modify this existing markdown content.\n\n<markdown_code>\n${markdown}\n</markdown_code>\n\nUser's request: "${currentPrompt}"`;
    } else {
        // Normal generation or ongoing chat
        finalPrompt = `User's profile description: "${currentPrompt}".`;
    }
    
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
      const finalPrompt = buildPrompt(userPrompt, false);
      // FIX: Removed non-null assertion '!' from process.env.API_KEY to align with guidelines.
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
        // FIX: The `text` property is a non-nullable string, so the nullish coalescing operator is not needed.
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
        // FIX: The `text` property is a non-nullable string, so the nullish coalescing operator is not needed.
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
