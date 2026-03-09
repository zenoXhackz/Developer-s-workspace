/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Code2, 
  Send, 
  Copy, 
  Check, 
  Terminal, 
  Sparkles, 
  Trash2, 
  ChevronRight,
  Menu,
  X,
  History,
  Cpu,
  Settings as SettingsIcon,
  User,
  Sliders,
  Palette,
  Bot,
  Mic,
  MicOff,
  Download,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { useSettings, ThemeColor, AIModel } from './hooks/useSettings';

// Speech Recognition Type Definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function App() {
  const { settings, updateSettings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const themeColors: Record<ThemeColor, string> = {
    emerald: 'emerald',
    blue: 'blue',
    violet: 'violet',
    rose: 'rose',
    amber: 'amber'
  };

  const activeThemeClass = `text-${settings.themeColor}-400`;
  const activeBgClass = `bg-${settings.themeColor}-500`;
  const activeBorderClass = `border-${settings.themeColor}-500/30`;
  const activeRingClass = `focus-within:border-${settings.themeColor}-500/50`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: settings.aiModel,
        config: {
          systemInstruction: settings.systemInstruction,
          temperature: settings.temperature,
        },
      });

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }]);

      const result = await chat.sendMessageStream({ message: prompt });
      
      let fullContent = '';
      for await (const chunk of result) {
        const text = chunk.text;
        fullContent += text;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
        ));
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Error: Failed to generate code. Please check your connection and try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadCode = (code: string, language: string) => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      cpp: 'cpp',
      java: 'java',
      rust: 'rs',
      go: 'go'
    };
    const ext = extensions[language.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codecraft-export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-[#0f0f0f] border-r border-white/5 flex flex-col lg:relative",
              !isSidebarOpen && "hidden lg:flex"
            )}
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", `bg-${settings.themeColor}-500/20`, `border-${settings.themeColor}-500/30`)}>
                  <Code2 className={cn("w-5 h-5", `text-${settings.themeColor}-400`)} />
                </div>
                <span className="font-bold tracking-tight text-lg">CodeCraft AI</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="px-2 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-3 h-3" />
                Recent Sessions
              </div>
              {messages.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-600 text-sm italic">
                  No history yet
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.filter(m => m.role === 'user').map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm text-zinc-400 truncate transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {m.content}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 space-y-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all text-sm border border-white/5"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={clearHistory}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-all text-sm border border-white/5"
              >
                <Trash2 className="w-4 h-4" />
                Clear History
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-zinc-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Terminal className={cn("w-4 h-4", `text-${settings.themeColor}-500`)} />
              <span className="hidden sm:inline">Terminal</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-200">{settings.displayName}'s Workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium capitalize", `bg-${settings.themeColor}-500/10`, `border-${settings.themeColor}-500/20`, `text-${settings.themeColor}-400`)}>
              <Cpu className="w-3 h-3" />
              {settings.aiModel.split('-')[1]} {settings.aiModel.split('-')[2]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 space-y-8 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
              <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center border animate-pulse", `bg-${settings.themeColor}-500/10`, `border-${settings.themeColor}-500/20`)}>
                <Sparkles className={cn("w-10 h-10", `text-${settings.themeColor}-400`)} />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {settings.displayName}</h1>
                <p className="text-zinc-400">Your custom AI coding environment is ready. What shall we build today?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {[
                  "Create a React login form with Tailwind",
                  "Write a Python script for web scraping",
                  "Generate a responsive navigation bar",
                  "Implement a binary search tree in C++"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className={cn(
                      "p-3 text-left text-sm rounded-xl bg-zinc-900/50 border border-white/5 transition-all text-zinc-400 hover:text-zinc-200",
                      `hover:border-${settings.themeColor}-500/50 hover:bg-${settings.themeColor}-500/5`
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-12">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-4",
                    message.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed",
                    message.role === 'user' 
                      ? `${activeBgClass} text-white shadow-lg shadow-${settings.themeColor}-900/20` 
                      : "bg-zinc-900 border border-white/5 text-zinc-300"
                  )}>
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              const language = match ? match[1] : 'text';
                              
                              return !inline && match ? (
                                <div className="relative group my-4">
                                  <div className="absolute right-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                      onClick={() => downloadCode(codeString, language)}
                                      title="Download Code"
                                      className="p-2 rounded-lg bg-zinc-800/80 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(codeString, message.id + className)}
                                      title="Copy Code"
                                      className="p-2 rounded-lg bg-zinc-800/80 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                                    >
                                      {copiedId === message.id + className ? <Check className={cn("w-4 h-4", `text-${settings.themeColor}-400`)} /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/5">
                                    <div className="px-4 py-2 bg-zinc-800/50 border-b border-white/5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileCode className={cn("w-3 h-3", `text-${settings.themeColor}-400`)} />
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{language}</span>
                                      </div>
                                    </div>
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={language}
                                      PreTag="div"
                                      className="!bg-transparent !m-0 !p-4 text-xs sm:text-sm"
                                      showLineNumbers={settings.showLineNumbers}
                                      {...props}
                                    >
                                      {codeString}
                                    </SyntaxHighlighter>
                                  </div>
                                </div>
                              ) : (
                                <code className={cn("bg-zinc-800 px-1.5 py-0.5 rounded", `text-${settings.themeColor}-400`, className)} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 lg:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <div className={cn("relative flex items-end gap-2 p-2 rounded-2xl bg-zinc-900 border border-white/10 transition-all shadow-2xl", activeRingClass)}>
              <div className="flex flex-col flex-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="Ask for any code..."
                  className="bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 py-3 px-4 resize-none max-h-[200px] text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-1 p-1">
                <button
                  onClick={toggleListening}
                  className={cn(
                    "p-3 rounded-xl transition-all flex items-center justify-center",
                    isListening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  )}
                  title={isListening ? "Stop Listening" : "Start Voice Input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className={cn(
                    "p-3 rounded-xl transition-all flex items-center justify-center",
                    prompt.trim() && !isGenerating
                      ? `${activeBgClass} text-white hover:opacity-90 shadow-lg shadow-${settings.themeColor}-500/20`
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  )}
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
              Powered by Google Gemini &bull; Optimized for {settings.displayName}
            </p>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", `bg-${settings.themeColor}-500/10`)}>
                    <SettingsIcon className={cn("w-5 h-5", `text-${settings.themeColor}-400`)} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Settings</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Profile Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    <User className="w-4 h-4" />
                    Profile
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-500">Display Name</label>
                    <input
                      type="text"
                      value={settings.displayName}
                      onChange={(e) => updateSettings({ displayName: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </section>

                {/* Appearance Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-500">Theme Color</label>
                      <div className="flex flex-wrap gap-3">
                        {(Object.keys(themeColors) as ThemeColor[]).map((color) => (
                          <button
                            key={color}
                            onClick={() => updateSettings({ themeColor: color })}
                            className={cn(
                              "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                              `bg-${color}-500`,
                              settings.themeColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                          >
                            {settings.themeColor === color && <Check className="w-5 h-5 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-white/5">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Show Line Numbers</div>
                        <div className="text-xs text-zinc-500">Display line numbers in code blocks</div>
                      </div>
                      <button
                        onClick={() => updateSettings({ showLineNumbers: !settings.showLineNumbers })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          settings.showLineNumbers ? `bg-${settings.themeColor}-500` : "bg-zinc-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          settings.showLineNumbers ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* AI Configuration Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    <Bot className="w-4 h-4" />
                    AI Configuration
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-500">Model Selection</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Best for complex tasks' },
                          { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Fast & efficient' }
                        ].map((model) => (
                          <button
                            key={model.id}
                            onClick={() => updateSettings({ aiModel: model.id as AIModel })}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              settings.aiModel === model.id 
                                ? `bg-${settings.themeColor}-500/10 border-${settings.themeColor}-500/50` 
                                : "bg-zinc-900 border-white/5 hover:bg-zinc-800"
                            )}
                          >
                            <div className={cn("text-sm font-medium", settings.aiModel === model.id ? `text-${settings.themeColor}-400` : "text-zinc-300")}>{model.name}</div>
                            <div className="text-[10px] text-zinc-500">{model.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-zinc-500">Temperature ({settings.temperature})</label>
                        <span className="text-[10px] text-zinc-600">Creative vs Precise</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                        className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-800", `accent-${settings.themeColor}-500`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-500">System Instruction</label>
                      <textarea
                        value={settings.systemInstruction}
                        onChange={(e) => updateSettings({ systemInstruction: e.target.value })}
                        rows={3}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={cn("px-6 py-2 rounded-xl text-white font-medium transition-all shadow-lg", activeBgClass, `shadow-${settings.themeColor}-500/20`)}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
