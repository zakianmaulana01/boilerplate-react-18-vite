import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DEMO_CATALOG } from '@/data/demoCatalog'
import { DemoCard } from '@/components/catalog/DemoCard'
import { FilterBar } from '@/components/catalog/FilterBar'

function CatalogPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [style, setStyle] = useState('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DEMO_CATALOG.filter((d) => {
      if (category !== 'All' && d.category !== category) return false
      if (style !== 'All' && d.style !== style) return false
      if (!q) return true
      const hay = `${d.title} ${d.subtitle} ${d.description} ${d.category} ${d.style} ${d.tags.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [query, category, style])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex w-full flex-col gap-6"
    >
      <FilterBar
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        style={style}
        setStyle={setStyle}
      />

      <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>{filtered.length} of {DEMO_CATALOG.length} demos</span>
        <span>Local mock • No external data</span>
      </div>

      {filtered.length === 0 ? (
        <div className="panel panel-padded text-center text-sm text-muted-foreground">
          No demo matches the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((demo) => (
            <DemoCard key={demo.id} demo={demo} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default CatalogPage
