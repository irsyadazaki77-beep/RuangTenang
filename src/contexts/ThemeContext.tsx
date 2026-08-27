import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeLocalStorage } from '../lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = safeLocalStorage.getItem('ruangtenang_theme') as ThemeMode | null;
    return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const actualTheme: 'light' | 'dark' = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (actualTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [actualTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    safeLocalStorage.setItem('ruangtenang_theme', newTheme);
  };

  const toggleTheme = () => {
    const next = actualTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
