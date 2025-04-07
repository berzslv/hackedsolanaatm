import React, { createContext, useContext, useEffect } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void; // Keeping the interface same, but this won't do anything
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always use dark theme
  const theme: Theme = 'dark';

  // Set dark mode immediately on mount
  useEffect(() => {
    // Clear any saved theme preference
    localStorage.removeItem('theme');
  }, []);

  // Toggle function is a no-op but kept for interface compatibility
  const toggleTheme = () => {
    // This function does nothing now - we always stay in dark mode
    console.log('Theme toggling is disabled - always using dark mode');
  };

  // Always apply dark theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};