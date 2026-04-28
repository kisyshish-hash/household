'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'default' | 'starbucks' | 'apple'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'default',
  setTheme: () => {},
})

// CSS variable overrides injected directly into :root
const THEME_VARS: Record<Theme, Record<string, string>> = {
  default: {},
  starbucks: {
    '--color-amber-50':  'oklch(97% 0.03 150)',
    '--color-amber-100': 'oklch(93% 0.07 150)',
    '--color-amber-200': 'oklch(87% 0.12 150)',
    '--color-amber-300': 'oklch(79% 0.16 150)',
    '--color-amber-400': 'oklch(69% 0.17 150)',
    '--color-amber-500': 'oklch(40% 0.13 158)',   // #00704a
    '--color-amber-600': 'oklch(35% 0.12 158)',   // #005f40
    '--color-amber-700': 'oklch(26% 0.09 162)',   // #1e3932
    '--color-indigo-600': 'oklch(40% 0.13 158)',
    '--color-indigo-700': 'oklch(35% 0.12 158)',
  },
  apple: {
    '--color-amber-50':  'oklch(97% 0.003 264)',  // #f5f5f7
    '--color-amber-100': 'oklch(93% 0.005 264)',  // #e8e8ed
    '--color-amber-200': 'oklch(86% 0.008 264)',
    '--color-amber-300': 'oklch(74% 0.01 264)',
    '--color-amber-400': 'oklch(56% 0.012 264)',
    '--color-amber-500': 'oklch(52% 0.22 259)',   // #0071e3
    '--color-amber-600': 'oklch(46% 0.22 259)',   // #0062c3
    '--color-amber-700': 'oklch(36% 0.20 259)',   // #004499
    '--color-indigo-600': 'oklch(52% 0.22 259)',
    '--color-indigo-700': 'oklch(46% 0.22 259)',
  },
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  // Reset all overridable vars first
  const allVars = new Set([
    ...Object.keys(THEME_VARS.starbucks),
    ...Object.keys(THEME_VARS.apple),
  ])
  allVars.forEach((v) => root.style.removeProperty(v))

  // Apply new theme vars
  const vars = THEME_VARS[t]
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('default')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'default'
    applyTheme(saved)
    setThemeState(saved)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
