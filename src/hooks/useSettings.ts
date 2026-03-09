import { useState, useEffect } from 'react';

export type ThemeColor = 'emerald' | 'blue' | 'violet' | 'rose' | 'amber';
export type AIModel = 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview';

export interface UserSettings {
  displayName: string;
  themeColor: ThemeColor;
  aiModel: AIModel;
  temperature: number;
  systemInstruction: string;
  showLineNumbers: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Developer',
  themeColor: 'emerald',
  aiModel: 'gemini-3.1-pro-preview',
  temperature: 0.7,
  systemInstruction: "You are CodeCraft AI, a world-class software engineer. Your goal is to generate clean, efficient, and well-documented code based on user requests. Always provide the code in markdown blocks with the correct language identifier. Explain briefly what the code does if necessary.",
  showLineNumbers: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('codecraft_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('codecraft_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return { settings, updateSettings };
}
