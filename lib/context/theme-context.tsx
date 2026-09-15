"use client";

import React, { createContext, useContext, useEffect } from "react";

// Dark mode is intentionally deferred while the product UI is stabilized.
// Retain this provider so the feature can be restored deliberately later.
type Theme = "light";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.removeItem("sf_theme");
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const setTheme = () => {
    document.documentElement.setAttribute("data-theme", "light");
  };

  const toggleTheme = () => {
    setTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
