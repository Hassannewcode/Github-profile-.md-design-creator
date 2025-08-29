

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Output } from './components/Output';
import { sanitizeContent } from './utils/privacy';

const SYSTEM_INSTRUCTION = `You are an elite creative coder and SVG artist with deep, specialized knowledge of GitHub's specific Markdown and SVG rendering engine. Your sole purpose is to transform user ideas into single, self-contained, interactive, and visually stunning Markdown snippets for GitHub profile READMEs.

**CRITICAL REQUIREMENTS:**
1.  **Output Raw Markdown ONLY:** Your entire response MUST be raw Markdown code. Do not include any explanations, greetings, apologies, or code fences (like \`\`\`markdown or \`\`\`). Your output must be immediately usable.
2.  **Self-Contained & GitHub-Perfect:** The generated code must work flawlessly when copied directly into a \`README.md\` file on GitHub. All assets, styles, and logic must be embedded. You MUST have an expert, almost obsessive, understanding of GitHub's unique rendering quirks and CSS sanitizer. Test your output mentally against these constraints before responding.
3.  **Rich Content Strategy:** Your primary tool for creating complex visuals and animations is embedded SVGs. Encode them as Base64 data URIs (\`data:image/svg+xml;base64,...\`) inside an image tag: \`![description](...)\`. For simpler layouts or text-based elements, you MAY use a limited subset of HTML and inline CSS that is compatible with GitHub's sanitizer.
4.  **Aesthetics are Paramount:** The goal is a premium, modern, and clean aesthetic. Think Vercel, Linear, or Gemini. Use fluid CSS animations (transforms/opacity), tasteful color palettes, and create designs that are both technically impressive and visually pleasing.
5.  **GitHub Rendering Constraints:**
    *   **NO JAVASCRIPT:** Absolutely NO JavaScript (\`<script>\` tags) is allowed. GitHub strips it completely. All interactivity must be faked using CSS pseudo-classes (\`:hover\`), SVG features, and CSS animations.
    *   **Limited HTML/CSS:** You may use basic HTML tags like \`<a>\`, \`<img>\`, \`<table>\`, \`<b>\`, \`<i>\`, etc. and inline \`style\` attributes. Complex tags and \`<style>\` blocks are often sanitized or rendered inconsistently. Your expertise in what works on GitHub is crucial here. Prioritize SVGs for anything complex.
6.  **Polished Interactivity:** Create interactive elements using CSS pseudo-classes like \`:hover\`. Use smooth \`transition\` properties for effects like scaling (\`transform: scale(1.05)\`) or color changes. You can wrap elements in SVG \`<a>\` tags or standard Markdown links to make them clickable.
7.  **Refinement Protocol:** When asked for changes, you MUST modify the previous code you generated. Output the complete, new, raw Markdown code with the requested refinements.
8.  **Generation Mode:**
    *   If **Mode** is **'Animated'**: Create a dynamic, animated SVG or use CSS animations.
    *   If **Mode** is **'Static'**: Create a beautiful but non-animated element. Ignore animation-related prompts.
9.  **Animation Control (Animated Mode Only):**
    *   **Speed:** Map 'Slow' to long durations (e.g., 10s-20s), 'Normal' to standard durations (e.g., 5s-10s), and 'Fast' to short durations (e.g., 1s-4s). If set to 'Auto', you must intelligently select the most aesthetically pleasing and appropriate speed based on the user's creative idea.
    *   **Direction:** Use the value directly for the \`animation-direction\` CSS property. If set to 'Auto', you must choose the most fitting and visually appealing animation direction from the available CSS values (normal, reverse, alternate, alternate-reverse).

**NEW: Chat Interaction Protocol:**
1.  **Conversational Assistant:** You are now a conversational assistant. Engage with the user in a friendly and helpful tone. Your goal is to collaboratively create the perfect README element.
2.  **Code Generation Command:** When the user asks you to generate or modify the SVG, you MUST respond with two parts in this exact order:
    1.  A friendly, conversational message explaining what you did (e.g., "Certainly! I've updated the animation to be faster. Here is the new code:").
    2.  The complete, raw Markdown code, enclosed in a special \`<markdown_code>\` tag.
3.  **CRITICAL Code Tag:** The entire raw Markdown output MUST be wrapped in \`<markdown_code>...</markdown_code>\`. The application relies on this exact tag to parse your response. Do not use Markdown fences (\`\`\`) around this tag.
    *   **Correct Example:**
        Great idea! Here is a matrix-style animation:
        <markdown_code>
        ![Matrix Rain](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIj48L3N2Zz4=)
        </markdown_code>
    *   **Incorrect Example:**
        \`\`\`markdown
        ![Matrix Rain](...)
        \`\`\`
4.  **Always Provide Full Code:** Every time you provide code, it must be the complete, self-contained, and final Markdown snippet. Do not provide diffs or partial code.
5.  **Adherence to Original Rules:** All the original rules (Self-Contained, No JS, Aesthetics, etc.) still apply to the code you generate *inside* the \`<markdown_code>\` tag.


**Accessibility First:**
*   **Descriptions:** Your top priority is to include descriptive \`<title>\` and \`<desc>\` elements inside the SVG tag. This is non-negotiable.
*   **ARIA Roles:** Add \`role="img"\` to the main \`<svg>\` tag.
*   **Alt Text:** Write a meaningful, descriptive alt text for the final Markdown \`![]()\`.
*   **Color Contrast:** Ensure text and important elements have sufficient color contrast.

**GitHub Token Usage:**
If a GitHub token is provided, you may use it for API calls.
**CRITICAL SECURITY RULE:** NEVER, under any circumstances, expose the user's token in the generated output. Do not embed it in URLs, comments, or any part of the SVG or Markdown.`;

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

const LOCAL_STORAGE_KEY = 'readmeGeneratorConfig_v2';

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

  // FIX: Renamed state variables to avoid shadowing global browser variables (window.prompt, window.history).
  const [userPrompt, setUserPrompt] = useState<string>(savedState.current?.prompt || '');
  const [githubToken, setGithubToken] = useState<string>(savedState.current?.githubToken || '');
  const [markdown, setMarkdown] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(savedState.current?.chatHistory || []);
  // Initialize with an empty string to allow undoing the first generation
  const [markdownHistory, setMarkdownHistory] = useState<string[]>(['']);
  const [markdownHistoryIndex, setMarkdownHistoryIndex] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatInstance = useRef<Chat | null>(null);
  const [isChatModeEnabled, setIsChatModeEnabled] = useState<boolean>(savedState.current?.isChatModeEnabled ?? true);
  const [mode, setMode] = useState<'static' | 'animated'>(savedState.current?.mode || 'animated');
  const [animationSpeed, setAnimationSpeed] = useState<string>(savedState.current?.animationSpeed || 'auto');
  const [animationDirection, setAnimationDirection] = useState<string>(savedState.current?.animationDirection || 'auto');
  
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
      mode,
      animationSpeed,
      animationDirection,
      chatHistory,
    };
    try {
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.warn("Could not save state to localStorage", err);
    }
  }, [userPrompt, githubToken, isChatModeEnabled, mode, animationSpeed, animationDirection, chatHistory]);


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
      // Don't interfere when typing in inputs
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
    setMode('animated');
    setAnimationSpeed('auto');
    setAnimationDirection('auto');
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
    let finalPrompt = `Mode: '${mode}'.\nUser's idea: "${currentPrompt}".`;

    if (mode === 'animated') {
      finalPrompt += `\n\n**Animation Customization:**`;
      finalPrompt += `\n- Animation Speed: ${animationSpeed}`;
      finalPrompt += `\n- Animation Direction: ${animationDirection}`;
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

      // Placeholder for AI response
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
        updateHistory(newMarkdown); // Apply first generation automatically
      } else if (!aiText) {
          setError("The AI didn't return any content. Try rephrasing your idea.");
      }

    } catch (err) {
      setError(getErrorMessage(err));
      setChatHistory(prev => prev.filter(msg => msg.sender === 'user')); // Remove placeholder on error
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
      
      // Placeholder for AI response
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
      setChatHistory(prev => prev.slice(0, -1)); // Remove placeholder on error
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
            mode={mode}
            setMode={setMode}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed}
            animationDirection={animationDirection}
            setAnimationDirection={setAnimationDirection}
            onReset={handleResetSettings}
          />
        </div>
        
        <div 
            className="absolute top-1/2 -translate-y-1/2 h-24 w-1.5 bg-white/5 rounded-full cursor-col-resize hover:bg-blue-500 transition-colors duration-200 z-20"
            style={{ left: `${panelWidth - 3}px` }} // Adjust position for visual centering
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