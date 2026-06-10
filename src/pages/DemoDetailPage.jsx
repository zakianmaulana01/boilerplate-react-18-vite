import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DEMO_CATALOG } from '@/data/demoCatalog'
import { DEMO_VIEW_REGISTRY } from '@/components/demo/registry'
import { cn } from '@/lib/utils'

function CrumbHeader({ demo }) {
  return (
    <div className="panel panel-padded">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Catalog</Link>
            <span>/</span>
            <span className="text-foreground">{demo.category}</span>
            <span>/</span>
            <span className="text-foreground">{demo.title}</span>
          </nav>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">{demo.title}</h1>
          <p className="text-sm font-medium text-muted-foreground">{demo.subtitle}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{demo.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={cn('rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm', demo.palette.from, demo.palette.to)}>{demo.style}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{demo.category}</span>
            {demo.tags.map((t) => (
              <span key={t} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 self-start rounded-full border border-border bg-card px-4 text-sm font-bold transition hover:bg-accent"
        >
          ← Back to catalog
        </Link>
      </div>
    </div>
  )
}

function BreakdownSection({ demo }) {
  const b = demo.canvasBreakdown
  const blocks = [
    { title: 'Layer stack', items: b.layers, accent: 'sky' },
    { title: 'Data bindings (mock)', items: b.bindings, accent: 'violet' },
    { title: 'Object groups', items: b.groups, accent: 'emerald' },
  ]
  return (
    <div className="panel panel-padded">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">Canvas breakdown</h2>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Workflow</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        How this demo's canvas is composed and bound to mock signals. Use this as a recipe
        for porting a real Genlogic / GLG drawing into the same React layout.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {blocks.map((blk) => (
          <div key={blk.title} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{blk.title}</div>
            <ul className="mt-2 space-y-1.5">
              {blk.items.map((it, i) => (
                <li key={it} className="flex items-baseline gap-2 text-xs font-semibold text-foreground">
                  <span className="font-mono text-[10px] text-muted-foreground">{(i + 1).toString().padStart(2, '0')}</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-3 text-xs leading-6 text-muted-foreground">
        <span className="font-black uppercase tracking-wider text-foreground">Interaction model · </span>
        {b.interaction}
      </div>
    </div>
  )
}

import { ViewModeProvider } from '@/hooks/useViewMode'

function DemoDetailPage() {
  const { demoId } = useParams()
  const demo = DEMO_CATALOG.find((d) => d.id === demoId)

  if (!demo) {
    return (
      <div className="panel panel-padded">
        <h1 className="text-xl font-black">Demo not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The demo &quot;{demoId}&quot; is not in the catalog.</p>
        <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">← Back to catalog</Link>
      </div>
    )
  }

  const View = DEMO_VIEW_REGISTRY[demo.viewKey]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex w-full flex-col gap-5"
    >
      <CrumbHeader demo={demo} />
      <ViewModeProvider initialMode="3D">
        {View ? <View demo={demo} /> : (
          <div className="panel panel-padded text-sm text-muted-foreground">View not registered.</div>
        )}
      </ViewModeProvider>
      <BreakdownSection demo={demo} />
    </motion.div>
  )
}

export default DemoDetailPage
