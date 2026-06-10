import { createContext, useContext, useState } from 'react'

const ViewModeContext = createContext({ mode: '3D', toggleMode: () => {} })

export function ViewModeProvider({ children, initialMode = '3D' }) {
  const [mode, setMode] = useState(initialMode)
  const toggleMode = () => setMode((m) => (m === '3D' ? '2D' : '3D'))
  return <ViewModeContext.Provider value={{ mode, toggleMode }}>{children}</ViewModeContext.Provider>
}

export function useViewMode() {
  return useContext(ViewModeContext)
}

export function ModeToggle() {
  const { mode, toggleMode } = useViewMode()
  return (
    <button
      type="button"
      onClick={toggleMode}
      className="inline-flex h-9 items-center rounded-xl bg-muted p-1 text-[11px] font-black uppercase tracking-wider"
    >
      <span className={`flex h-full items-center rounded-lg px-3 transition-colors ${mode === '3D' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
        3D View
      </span>
      <span className={`flex h-full items-center rounded-lg px-3 transition-colors ${mode === '2D' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
        2D Eng
      </span>
    </button>
  )
}
