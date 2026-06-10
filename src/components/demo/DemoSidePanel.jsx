import { StatusPill } from '@/components/demo/DemoPrimitives'

export function DemoSidePanel({ running, setRunning, reset, signals = [], alarms = [], widgets = [], notes = [] }) {
  const activeAlarms = alarms.filter((a) => a.status !== 'normal')
  return (
    <aside className="flex flex-col gap-4">
      <div className="panel panel-padded">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Controls</h3>
          <StatusPill status={running ? 'normal' : 'offline'}>{running ? 'Running' : 'Paused'}</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setRunning((v) => !v)} className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90">
            {running ? 'Stop' : 'Start'} simulation
          </button>
          <button type="button" onClick={reset} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-black transition hover:bg-accent">
            Reset
          </button>
        </div>
      </div>

      <div className="panel panel-padded">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Active signals</h3>
        <div className="mt-3 space-y-2">
          {signals.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div>
                <div className="font-mono text-[11px] font-black text-foreground">{s.id}</div>
                <div className="text-[11px] font-medium text-muted-foreground">{s.label}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-black tabular-nums text-foreground">{s.value}<span className="ml-1 text-[10px] text-muted-foreground">{s.unit}</span></div>
                <StatusPill status={s.status}>{s.status}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel panel-padded">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Alarm summary</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black text-muted-foreground">{activeAlarms.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {alarms.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-black text-foreground">{a.id}</span>
                <StatusPill status={a.status}>{a.status}</StatusPill>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.message}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel panel-padded">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Widget list</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {widgets.map((w) => <span key={w} className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{w}</span>)}
        </div>
      </div>

      <div className="panel panel-padded">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Workflow explanation</h3>
        <ul className="mt-3 space-y-2">
          {notes.map((n, i) => (
            <li key={n} className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <span className="font-mono font-black text-foreground">{i + 1}</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
