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
3.  **Embedded SVGs via Base64:** All graphics, games, or animations MUST be embedded SVGs encoded as a Base64 data URI (\`data:image/svg+xml;base64,...\`) inside an image tag: \`![description](...)\`. This is the ONLY reliable method. Do not suggest alternatives.
4.  **Aesthetics are Paramount:** The goal is a premium, modern, and clean aesthetic. Think Vercel, Linear, or Gemini. Use fluid CSS animations (transforms/opacity), tasteful color palettes, and create designs that are both technically impressive and visually pleasing.
5.  **NO JAVASCRIPT / UNSUPPORTED HTML:** GitHub's Markdown renderer strips all JavaScript and most HTML tags. Do NOT use \`<script>\` tags. All interactivity must be achieved through CSS pseudo-classes (\`:hover\`), SVG features, and CSS animations. Do NOT use HTML tags like \`<details>\` or \`<div>\`. Stick to what is renderable in a raw \`.md\` file.
6.  **Polished Interactivity:** Create interactive elements using CSS pseudo-classes like \`:hover\`. Use smooth \`transition\` properties for effects like scaling (\`transform: scale(1.05)\`) or color changes. You can wrap elements in SVG \`<a>\` tags to make them clickable links.
7.  **Refinement Protocol:** When asked for changes, you MUST modify the previous SVG code you generated. Output the complete, new, raw Markdown code with the requested refinements.
8.  **Generation Mode:**
    *   If **Mode** is **'Animated'**: Create a dynamic, animated SVG.
    *   If **Mode** is **'Static'**: Create a beautiful but non-animated SVG. Ignore animation-related prompts.
9.  **Animation Control (Animated Mode Only):**
    *   **Speed:** Map 'Slow' to long durations (e.g., 10s-20s), 'Normal' to standard durations (e.g., 5s-10s), and 'Fast' to short durations (e.g., 1s-4s). If set to 'Auto', you must intelligently select the most aesthetically pleasing and appropriate speed based on the user's creative idea.
    *   **Direction:** Use the value directly for the \`animation-direction\` CSS property. If set to 'Auto', you must choose the most fitting and visually appealing animation direction from the available CSS values (normal, reverse, alternate, alternate-reverse).

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

  const [prompt, setPrompt] = useState<string>(savedState.current?.prompt || '');
  const [githubToken, setGithubToken] = useState<string>(savedState.current?.githubToken || '');
  const [markdown, setMarkdown] = useState<string>('');
  // Initialize with an empty string to allow undoing the first generation
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
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
      prompt,
      githubToken,
      isChatModeEnabled,
      mode,
      animationSpeed,
      animationDirection,
    };
    try {
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.warn("Could not save state to localStorage", err);
    }
  }, [prompt, githubToken, isChatModeEnabled, mode, animationSpeed, animationDirection]);


  useEffect(() => {
    if (githubToken.trim() && markdown) {
      const sanitized = sanitizeContent(markdown, githubToken);
      if (sanitized !== markdown) {
        setMarkdown(sanitized);
      }
    }
  }, [markdown, githubToken]);

  const updateHistory = (newMarkdown: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMarkdown);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarkdown(newMarkdown);
  };
  
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setMarkdown(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setMarkdown(history[newIndex]);
    }
  }, [history, historyIndex]);

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
    setPrompt('');
    setGithubToken('');
    setIsChatModeEnabled(true);
    setMode('animated');
    setAnimationSpeed('auto');
    setAnimationDirection('auto');
  };

  const buildPrompt = (userPrompt: string): string => {
    let finalPrompt = `Mode: '${mode}'.\nUser's idea: "${userPrompt}".`;

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
    if (!prompt.trim()) {
      setError('Please enter a description of what you want to create.');
      return;
    }
    setIsStreaming(true);
    setError(null);
    setMarkdown('');
    let streamedMarkdown = '';

    try {
      const finalPrompt = buildPrompt(prompt);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      setChat(isChatModeEnabled ? newChat : null);

      const responseStream = isChatModeEnabled
        ? await newChat.sendMessageStream({ message: finalPrompt })
        : await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: finalPrompt,
            config: { systemInstruction: SYSTEM_INSTRUCTION },
          });

      for await (const chunk of responseStream) {
        const text = chunk.text ?? '';
        streamedMarkdown += text;
        setMarkdown(prev => prev + text);
      }
      updateHistory(streamedMarkdown);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsStreaming(false);
    }
  };
  
  const handleRefine = async (refinementPrompt: string) => {
    if (!refinementPrompt.trim() || !chat) {
      return;
    }
    setIsStreaming(true);
    setError(null);
    setMarkdown('');
    let streamedMarkdown = '';
    
    try {
      const finalPrompt = buildPrompt(refinementPrompt);
      const responseStream = await chat.sendMessageStream({ message: finalPrompt });
      for await (const chunk of responseStream) {
        const text = chunk.text ?? '';
        streamedMarkdown += text;
        setMarkdown(prev => prev + text);
      }
      updateHistory(streamedMarkdown);
    } catch(err) {
      setError(getErrorMessage(err));
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
            prompt={prompt}
            setPrompt={setPrompt}
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
            onRefine={handleRefine}
            isRefining={isStreaming}
            isChatModeEnabled={isChatModeEnabled}
            historyIndex={historyIndex}
            historyLength={history.length}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>
      </main>
    </div>
  );
};

export default App;