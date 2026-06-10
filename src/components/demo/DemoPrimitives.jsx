import { cn } from '@/lib/utils'

export function StatusPill({ status = 'normal', children }) {
  const styles = {
    normal: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    alarm: 'bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    offline: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wider', styles[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-emerald-500': status === 'normal',
        'bg-amber-500': status === 'warning',
        'bg-red-500': status === 'alarm',
        'bg-sky-500': status === 'info',
        'bg-slate-400': status === 'offline',
      })} />
      {children || status}
    </span>
  )
}

export function CanvasShell({ children, className = '', title, dark = false }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border shadow-sm', dark ? 'bg-slate-950 text-slate-100' : 'bg-canvas-panel', className)}>
      {title && (
        <div className={cn('flex items-center justify-between border-b px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]', dark ? 'border-slate-800 text-slate-400' : 'border-border text-muted-foreground')}>
          <span>{title}</span>
          <span>Local Mock</span>
        </div>
      )}
      {children}
    </div>
  )
}

export function Metric({ label, value, unit, tone = 'info' }) {
  const styles = {
    info: 'text-sky-700 dark:text-sky-300',
    good: 'text-emerald-700 dark:text-emerald-300',
    warn: 'text-amber-700 dark:text-amber-300',
    bad: 'text-red-700 dark:text-red-300',
    neutral: 'text-foreground',
  }
  return (
    <div className="rounded-xl border border-border bg-card/80 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('mt-1 font-mono text-xl font-black tabular-nums', styles[tone])}>
        {value}<span className="ml-1 text-xs font-semibold opacity-70">{unit}</span>
      </div>
    </div>
  )
}

export function MiniSpark({ values = [], color = '#2563eb', h = 48 }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / Math.max(values.length - 1, 1)) * 100} ${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 100 ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
