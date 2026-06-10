import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Each demo card has a unique, generative micro-preview SVG so that
 * the catalog grid does not look like 10 copies of the same template.
 */
function PreviewArt({ demo }) {
  const k = demo.id
  const base = `bg-gradient-to-br ${demo.palette.from} ${demo.palette.to}`
  const previews = {
    'mfg-mixing': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="g1" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" stroke="rgba(255,255,255,0.12)" fill="none"/></pattern></defs>
        <rect width="240" height="140" fill="url(#g1)" />
        <rect x="20" y="36" width="40" height="84" rx="6" fill="rgba(255,255,255,0.92)" />
        <rect x="22" y={36 + 40} width="36" height="44" fill="rgba(56,189,248,0.85)" />
        <path d="M60 60 H120 V100 H180" stroke="rgba(255,255,255,0.95)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="120" cy="60" r="9" fill="white" stroke="#0ea5e9" strokeWidth="2.5" />
        <rect x="170" y="64" width="46" height="62" rx="6" fill="rgba(255,255,255,0.85)" />
      </svg>
    ),
    'water-distribution': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <path d="M20 80 H80 V40 H160 V100 H220" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="6 6">
          <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.2s" repeatCount="indefinite" />
        </path>
        <circle cx="80" cy="40" r="9" fill="white" />
        <circle cx="160" cy="40" r="9" fill="white" />
        <circle cx="160" cy="100" r="9" fill="white" />
        <rect x="200" y="92" width="24" height="32" rx="4" fill="rgba(255,255,255,0.92)" />
      </svg>
    ),
    'power-substation': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <line x1="20" y1="38" x2="220" y2="38" stroke="white" strokeWidth="3.5" />
        {[60, 110, 160, 200].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="38" x2={x} y2="64" stroke="white" strokeWidth="2.5" />
            <rect x={x - 8} y={62} width={16} height={12} fill="white" stroke="rgba(0,0,0,0.2)" />
            <line x1={x} y1="78" x2={x} y2="118" stroke="white" strokeWidth="2.5" />
            <circle cx={x} cy={124} r="6" fill="rgba(255,255,255,0.85)" />
          </g>
        ))}
        <text x="22" y="32" fill="white" fontSize="10" fontWeight="700">BUS 11kV</text>
      </svg>
    ),
    'power-feeder': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <line x1="20" y1="38" x2="220" y2="38" stroke="white" strokeWidth="3.5" />
        {[60, 110, 160, 200].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="38" x2={x} y2="64" stroke="white" strokeWidth="2.5" />
            <rect x={x - 8} y={62} width={16} height={12} fill="white" stroke="rgba(0,0,0,0.2)" />
            <line x1={x} y1="78" x2={x} y2="118" stroke="white" strokeWidth="2.5" />
            <circle cx={x} cy={124} r="6" fill="rgba(255,255,255,0.85)" />
          </g>
        ))}
        <text x="22" y="32" fill="white" fontSize="10" fontWeight="700">BUS 11kV</text>
      </svg>
    ),
    'oil-gas-tankfarm': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="g1" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" stroke="rgba(255,255,255,0.12)" fill="none"/></pattern></defs>
        <rect width="240" height="140" fill="url(#g1)" />
        <rect x="20" y="36" width="40" height="84" rx="6" fill="rgba(255,255,255,0.92)" />
        <rect x="22" y={36 + 40} width="36" height="44" fill="rgba(56,189,248,0.85)" />
        <path d="M60 60 H120 V100 H180" stroke="rgba(255,255,255,0.95)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="120" cy="60" r="9" fill="white" stroke="#0ea5e9" strokeWidth="2.5" />
        <rect x="170" y="64" width="46" height="62" rx="6" fill="rgba(255,255,255,0.85)" />
      </svg>
    ),
    'hvac-chiller': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i} transform={`translate(${22 + i * 52}, 18)`}>
            <rect width="44" height="44" rx="9" fill="rgba(255,255,255,0.92)" />
            <rect y="48" width="44" height="6" rx="3" fill="rgba(255,255,255,0.6)" />
            <rect width={[40, 30, 38, 20][i]} y="48" height="6" rx="3" fill="white" />
          </g>
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={20 + i * 26} y={92} width={[16, 22, 12, 26, 19, 24, 15, 21][i]} height="24" rx="3" fill="rgba(255,255,255,0.85)" />
        ))}
      </svg>
    ),
    'mfg-packaging': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <path d="M20 70 H 60 M 88 70 H 130 M 170 70 H 220" stroke="white" strokeWidth="2.5" fill="none" />
        <path d="M60 60 L 64 80 L 72 60 L 80 80 L 88 60" stroke="white" strokeWidth="2.5" fill="none" />
        <circle cx="150" cy="70" r="14" fill="none" stroke="white" strokeWidth="2.5" />
        <line x1="150" y1="56" x2="150" y2="84" stroke="white" strokeWidth="2.5" />
        <line x1="136" y1="70" x2="164" y2="70" stroke="white" strokeWidth="2.5" />
        <rect x="40" y="100" width="160" height="2" fill="white" opacity="0.6" />
        <text x="22" y="116" fill="white" fontSize="9" fontWeight="700">CKT-04</text>
      </svg>
    ),
    'data-center-rack': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {[0, 1].map((row) => Array.from({ length: 8 }).map((_, i) => (
          <rect key={`${row}-${i}`} x={16 + i * 26} y={22 + row * 46} width={22} height={36} rx={3} fill="rgba(255,255,255,0.88)" />
        )))}
        <rect x="16" y="116" width="208" height="10" rx="4" fill="rgba(255,255,255,0.45)" />
        <rect x="16" y="116" width="118" height="10" rx="4" fill="white" />
      </svg>
    ),
    'gis-site-network': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <path d="M0 90 Q 50 60 100 80 T 240 70 L 240 140 L 0 140 Z" fill="rgba(255,255,255,0.25)" />
        <path d="M0 100 Q 60 70 130 90 T 240 80" stroke="white" strokeWidth="2" fill="none" />
        {[{ x: 50, y: 60 }, { x: 110, y: 50 }, { x: 170, y: 80 }, { x: 200, y: 40 }].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill="white" />
            <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="white" strokeOpacity="0.5" />
          </g>
        ))}
      </svg>
    ),
    'exec-industrial': (
      <svg viewBox="0 0 240 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {[{x:16,w:64},{x:88,w:64},{x:160,w:64}].map((c,i)=>(
          <g key={i}>
            <rect x={c.x} y="20" width={c.w} height="42" rx="6" fill="rgba(255,255,255,0.9)" />
            <rect x={c.x+10} y="28" width={c.w-40} height="6" rx="3" fill={demo.palette.from === 'from-slate-700' ? '#334155' : 'rgba(0,0,0,0.45)'} />
            <rect x={c.x+10} y="40" width={c.w-50} height="10" rx="3" fill="#0f172a" />
          </g>
        ))}
        <rect x="16" y="76" width="208" height="50" rx="6" fill="rgba(255,255,255,0.85)" />
        <path d="M22 116 L 60 92 L 100 104 L 140 86 L 180 100 L 220 80" stroke="#0f172a" strokeWidth="2" fill="none" />
      </svg>
    ),
  }
  return (
    <div className={cn('relative aspect-[5/3] w-full overflow-hidden', base)}>
      <div className="absolute inset-0 opacity-90">{previews[k]}</div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>
  )
}

export function DemoCard({ demo }) {
  return (
    <Link to={`/demo/${demo.id}`} className="group block">
      <motion.div
        layout
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-lg"
      >
        <div className="relative">
          <PreviewArt demo={demo} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm">{demo.style}</span>
          </div>
          <div className="absolute right-3 top-3">
            <span className="rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">{demo.category}</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="text-base font-bold text-white drop-shadow-md">{demo.title}</div>
            <div className="text-xs font-medium text-white/85">{demo.subtitle}</div>
          </div>
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">{demo.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {demo.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">View canvas →</span>
            <span className={cn('text-xs font-bold', demo.palette.text)}>{demo.id.split('-')[0]}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
