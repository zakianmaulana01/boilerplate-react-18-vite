import { NavLink } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-soft">
            GLG
          </span>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-foreground">SCADA Demo Catalog</div>
            <div className="text-[11px] font-medium text-muted-foreground">Local HMI / dashboard visual gallery</div>
          </div>
        </NavLink>

        <div className="flex items-center gap-2">
          <NavLink
            to="/"
            className={({ isActive }) => cn('hidden rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition md:inline-flex', isActive && 'bg-muted text-foreground')}
          >
            Catalog
          </NavLink>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Toggle theme"
          >
            <span className="text-base">{theme === 'light' ? '☀' : '◐'}</span>
            <span className="hidden sm:inline">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
