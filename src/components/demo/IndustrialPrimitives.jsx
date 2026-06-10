import { cn } from '@/lib/utils'

export function Gradients() {
  return (
    <defs>
      {/* Existing gradients */}
      <linearGradient id="steel" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f8fafc"/><stop offset=".32" stopColor="#cbd5e1"/><stop offset=".65" stopColor="#64748b"/><stop offset="1" stopColor="#e2e8f0"/></linearGradient>
      <linearGradient id="darkSteel" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#94a3b8"/><stop offset=".35" stopColor="#334155"/><stop offset=".7" stopColor="#0f172a"/><stop offset="1" stopColor="#64748b"/></linearGradient>
      <linearGradient id="pipeBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7dd3fc"/><stop offset=".45" stopColor="#0284c7"/><stop offset="1" stopColor="#075985"/></linearGradient>
      <linearGradient id="pipeGreen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#86efac"/><stop offset=".45" stopColor="#16a34a"/><stop offset="1" stopColor="#166534"/></linearGradient>
      <linearGradient id="pipeAmber" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fde68a"/><stop offset=".45" stopColor="#d97706"/><stop offset="1" stopColor="#92400e"/></linearGradient>
      <linearGradient id="oil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fef3c7"/><stop offset=".45" stopColor="#b45309"/><stop offset="1" stopColor="#451a03"/></linearGradient>
      <radialGradient id="glass" cx="35%" cy="25%" r="70%"><stop offset="0" stopColor="#ffffff" stopOpacity=".95"/><stop offset=".42" stopColor="#dbeafe" stopOpacity=".65"/><stop offset="1" stopColor="#2563eb" stopOpacity=".18"/></radialGradient>
      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#020617" floodOpacity=".28"/></filter>
      <filter id="smallShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity=".22"/></filter>
      <radialGradient id="steamGradient" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff" stopOpacity="0.8" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>

      {/* Realistic GLG Industrial Equipment Gradients */}
      <linearGradient id="glgTank" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7a7a7a"/>
        <stop offset="15%" stopColor="#dcdcdc"/>
        <stop offset="50%" stopColor="#ffffff"/>
        <stop offset="85%" stopColor="#dcdcdc"/>
        <stop offset="100%" stopColor="#7a7a7a"/>
      </linearGradient>
      <linearGradient id="glgCyanSphere" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0ffff"/>
        <stop offset="30%" stopColor="#00ced1"/>
        <stop offset="70%" stopColor="#008b8b"/>
        <stop offset="100%" stopColor="#004c4c"/>
      </linearGradient>
      <radialGradient id="glgBlueSphere" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#38bdf8"/>
        <stop offset="50%" stopColor="#0284c7"/>
        <stop offset="100%" stopColor="#082f49"/>
      </radialGradient>
      <linearGradient id="glgPipeH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b3b3b3"/>
        <stop offset="50%" stopColor="#ffffff"/>
        <stop offset="100%" stopColor="#b3b3b3"/>
      </linearGradient>
      <linearGradient id="glgPipeV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b3b3b3"/>
        <stop offset="50%" stopColor="#ffffff"/>
        <stop offset="100%" stopColor="#b3b3b3"/>
      </linearGradient>
      <linearGradient id="glgYellowBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fef08a"/>
        <stop offset="50%" stopColor="#fde047"/>
        <stop offset="100%" stopColor="#eab308"/>
      </linearGradient>
      <linearGradient id="glgCyanBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0891b2"/>
        <stop offset="50%" stopColor="#0284c7"/>
        <stop offset="100%" stopColor="#0369a1"/>
      </linearGradient>
    </defs>
  )
}

export function SteamCloud({ x, y, size = 20, delay = 0 }) {
  return (
    <circle cx={x} cy={y} r={size} fill="url(#steamGradient)">
      <animate attributeName="cy" from={y} to={y - 80} dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
      <animate attributeName="r" from={size} to={size * 1.8} dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.8;0" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  )
}

export function SceneFrame({ children, className, title }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Mock Local</span>
      </div>
      {children}
    </div>
  )
}

export function Pipe3D({ d, color = 'pipeBlue', width = 18, flow = true }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#334155" strokeWidth={width + 6} strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
      <path d={d} fill="none" stroke={`url(#${color})`} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" filter="url(#smallShadow)" />
      <path d={d} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={Math.max(2, width * .18)} strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-5)" />
      {flow && <path d={d} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 20" style={{ animation: 'scada-pipe-flow 1.4s linear infinite' }} />}
    </g>
  )
}

export function Pipe2D({ d, color = '#2563eb', flow = true }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-2)" />
      {flow && <path d={d} fill="none" stroke="#0f172a" strokeWidth="1.7" strokeDasharray="10 14" strokeLinecap="round" style={{ animation: 'scada-pipe-flow 1.2s linear infinite' }} />}
    </g>
  )
}

export function Tank3D({ x, y, label, level = 50, liquid = '#38bdf8', scale = 1 }) {
  const h = 150 * scale
  const w = 92 * scale
  const fill = (level / 100) * (h - 22)
  return (
    <g transform={`translate(${x},${y})`} filter="url(#softShadow)">
      <ellipse cx="0" cy={-h / 2} rx={w / 2} ry={16 * scale} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8 * scale} fill="url(#steel)" stroke="#64748b" strokeWidth="2" />
      <clipPath id={`tank-fill-${label}`}><rect x={-w / 2 + 7} y={-h / 2 + 10} width={w - 14} height={h - 20} rx="6" /></clipPath>
      <rect x={-w / 2 + 7} y={h / 2 - 10 - fill} width={w - 14} height={fill} fill={liquid} opacity=".45" clipPath={`url(#tank-fill-${label})`} />
      <ellipse cx="0" cy={h / 2} rx={w / 2} ry={16 * scale} fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
      <path d={`M${-w / 2 + 12},${-h / 2 + 12} C${-w / 4},${-h / 2 + 4} ${-w / 3},${h / 2 - 20} ${-w / 2 + 16},${h / 2 - 12}`} stroke="rgba(255,255,255,.65)" strokeWidth="7" fill="none" strokeLinecap="round" />
      <text x="0" y={-h / 2 - 24} textAnchor="middle" fontSize="12" fontWeight="900" fill="#334155">{label}</text>
      <text x="0" y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">{level.toFixed(0)}%</text>
    </g>
  )
}

export function Tank2D({ x, y, label, level = 50 }) {
  const fill = level * 1.15
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-42" y="-70" width="84" height="140" fill="none" stroke="#334155" strokeWidth="3" />
      <rect x="-38" y={66 - fill} width="76" height={fill} fill="#93c5fd" opacity=".65" />
      <text x="0" y="-82" textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{label}</text>
      <text x="0" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill="#334155">{level.toFixed(0)}%</text>
    </g>
  )
}

export function Pump3D({ x, y, label, running = true, color = '#22c55e' }) {
  return (
    <g transform={`translate(${x},${y})`} filter="url(#softShadow)">
      <ellipse cx="0" cy="30" rx="48" ry="13" fill="#020617" opacity=".22" />
      <rect x="-42" y="-20" width="84" height="48" rx="16" fill="url(#darkSteel)" stroke="#475569" strokeWidth="2" />
      <circle cx="-18" cy="2" r="32" fill="url(#steel)" stroke={color} strokeWidth="3" />
      <g className={running ? 'scada-pump-spin' : ''}>
        <path d="M-18-19 V21 M-38 1 H2 M-32-13 L-4 15 M-32 15 L-4-13" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
      <rect x="32" y="-34" width="54" height="34" rx="7" fill="url(#darkSteel)" stroke="#475569" />
      <text x="10" y="58" textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function Pump2D({ x, y, label, running = true }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="28" fill="none" stroke="#334155" strokeWidth="3" />
      <path d="M-18 0H18M0-18V18" stroke={running ? '#16a34a' : '#64748b'} strokeWidth="3" />
      <text y="48" textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function Valve3D({ x, y, label, open = 70 }) {
  const color = open > 15 ? '#0ea5e9' : '#64748b'
  return (
    <g transform={`translate(${x},${y})`} filter="url(#smallShadow)">
      <path d="M-32-22L0 0L-32 22Z" fill={color} stroke="#334155" strokeWidth="2" />
      <path d="M32-22L0 0L32 22Z" fill={color} stroke="#334155" strokeWidth="2" />
      <rect x="-5" y="-44" width="10" height="22" fill="#64748b" />
      <rect x="-26" y="-54" width="52" height="12" rx="4" fill="url(#steel)" stroke="#64748b" />
      <text x="0" y="50" textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function Valve2D({ x, y, label, open = 70 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-22-16L0 0L-22 16ZM22-16L0 0L22 16Z" fill="none" stroke={open > 15 ? '#2563eb' : '#64748b'} strokeWidth="3" />
      <text x="0" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function FlowMeter3D({ x, y, label, value }) {
  return (
    <g transform={`translate(${x},${y})`} filter="url(#smallShadow)">
      <rect x="-34" y="-24" width="68" height="48" rx="14" fill="url(#glass)" stroke="#0284c7" strokeWidth="2" />
      <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
      <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="900" fill="#e0f2fe">{value}</text>
      <text x="0" y="45" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function Panel3D({ x, y, w = 92, h = 130, label, status = 'normal' }) {
  const lamp = status === 'alarm' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e'
  return (
    <g transform={`translate(${x},${y})`} filter="url(#softShadow)">
      <path d={`M${-w/2},${-h/2} L${w/2},${-h/2-18} L${w/2},${h/2-18} L${-w/2},${h/2}Z`} fill="url(#steel)" stroke="#64748b" strokeWidth="2" />
      <circle cx={w/2 - 24} cy={-h/2 + 20} r="7" fill={lamp} className={status !== 'normal' ? 'scada-blink' : ''} />
      <rect x={-w/2 + 16} y={-h/2 + 40} width={w - 32} height="32" rx="5" fill="#0f172a" />
      <rect x={-w/2 + 16} y={-h/2 + 84} width={w - 32} height="10" rx="4" fill="#94a3b8" />
      <text x="0" y={h/2 + 22} textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{label}</text>
    </g>
  )
}

export function Conveyor3D({ x, y, w = 220, running = true }) {
  return (
    <g transform={`translate(${x},${y})`} filter="url(#smallShadow)">
      <path d={`M0 0 L${w} 0 L${w-26} 34 L-26 34 Z`} fill="url(#darkSteel)" stroke="#475569" />
      {Array.from({ length: 7 }).map((_, i) => <rect key={i} x={20 + i * 28} y="4" width="18" height="24" rx="3" fill="#f8fafc" opacity={running ? .9 : .55} />)}
      <circle cx="0" cy="34" r="14" fill="#64748b" /><circle cx={w-26} cy="34" r="14" fill="#64748b" />
    </g>
  )
}
