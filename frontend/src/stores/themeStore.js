import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const getInitialTheme = () => {
  const stored = JSON.parse(localStorage.getItem('theme-storage') || '{}');
  if (stored?.state?.theme) return stored.state.theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      }
    }),
    {
      name: 'theme-storage'
    }
  )
);

// Appliquer le thème dès le chargement du module (avant le premier rendu)
applyTheme(useThemeStore.getState().theme);
