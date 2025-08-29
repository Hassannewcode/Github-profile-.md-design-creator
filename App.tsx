import React, { useState } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Output } from './components/Output';

const SYSTEM_INSTRUCTION = `You are an elite creative coder and SVG artist specializing in generating single, self-contained, and interactive Markdown snippets for GitHub profile READMEs. Your goal is to turn a user's idea into a functional, and visually stunning Markdown file.

**CRITICAL REQUIREMENTS:**
1.  **Output Raw Markdown Only:** Your entire response must be ONLY the raw Markdown code. Do not include any explanations, greetings, or code fences (like \`\`\`markdown or \`\`\`).
2.  **Self-Contained:** The generated code must work by simply copying and pasting it into a \`README.md\` file. All assets, styles, and logic must be embedded.
3.  **Use Embedded SVGs:** For any graphics, games, or animations, you MUST use embedded SVGs with CSS animations. The SVG MUST be encoded as a Base64 data URI (\`data:image/svg+xml;base64,...\`) within an image tag \`![description](...)\`. This is the only way to ensure it works on GitHub without external files.
4.  **Aesthetics are Key:** Prioritize modern aesthetics, fluid animations (using CSS transforms and opacity), and clever use of SVG features. Create something that looks professional and impressive.
5.  **No JavaScript:** GitHub Markdown does not execute JavaScript. All interactivity must be achieved through CSS animations and SVG features.
6.  **Refinement:** When the user asks for changes, modify the previous SVG code you generated to incorporate their feedback, and output the complete, new raw Markdown code.`;


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isChatModeEnabled, setIsChatModeEnabled] = useState<boolean>(true);


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of what you want to create.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMarkdown('');
    setChat(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      if (isChatModeEnabled) {
        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        setChat(newChat);
        const response = await newChat.sendMessage({ message: prompt });
        setMarkdown(response.text);
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
        setMarkdown(response.text);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to generate README. The AI might be busy or the request is too complex. Please try again with a simpler idea.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefine = async (refinementPrompt: string) => {
    if (!refinementPrompt.trim() || !chat) {
      return;
    }
    setIsRefining(true);
    setError(null);
    
    try {
      const response = await chat.sendMessage({ message: refinementPrompt });
      const finalMarkdown = response.text;
      setMarkdown(finalMarkdown);
    } catch(err) {
      console.error(err);
      setError('Failed to refine the README. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <Header />
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Controls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            isChatModeEnabled={isChatModeEnabled}
            setIsChatModeEnabled={setIsChatModeEnabled}
          />
          <Output 
            markdown={markdown} 
            isLoading={isLoading} 
            error={error} 
            onRefine={handleRefine}
            isRefining={isRefining}
            isChatModeEnabled={isChatModeEnabled}
          />
        </main>
         <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Gemini API. Crafted with React & Tailwind CSS.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;