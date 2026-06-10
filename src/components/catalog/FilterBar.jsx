import { CATEGORIES, STYLE_TAGS } from '@/data/demoCatalog'
import { cn } from '@/lib/utils'

export function FilterBar({ query, setQuery, category, setCategory, style, setStyle }) {
  return (
    <div className="panel panel-padded flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">SCADA Demo Catalog</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Explore 10 local, mock-data HMI and dashboard canvases inspired by Genlogic demo categories.
          </p>
        </div>
        <div className="w-full lg:w-80">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search demo, tag, category..."
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', ...CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-bold transition', category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground')}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...STYLE_TAGS].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStyle(item)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-bold transition', style === item ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
