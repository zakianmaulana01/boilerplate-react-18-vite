/**
 * GenLogic-faithful SVG primitives — matching the REAL 3D pipe/tank look.
 * Key insight: GenLogic uses GREY 3D cylindrical pipes with colored dashed
 * flow lines running inside them, NOT colored pipe backgrounds.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   GRADIENT DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLDefs() {
  return (
    <defs>
      {/* Horizontal pipe gradient (top-to-bottom shading) */}
      <linearGradient id="glPipeH" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#e8e8e8" />
        <stop offset="20%" stopColor="#f5f5f5" />
        <stop offset="50%" stopColor="#b8b8b8" />
        <stop offset="80%" stopColor="#888" />
        <stop offset="100%" stopColor="#666" />
      </linearGradient>
      {/* Vertical pipe gradient (left-to-right shading) */}
      <linearGradient id="glPipeV" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#e8e8e8" />
        <stop offset="20%" stopColor="#f5f5f5" />
        <stop offset="50%" stopColor="#b8b8b8" />
        <stop offset="80%" stopColor="#888" />
        <stop offset="100%" stopColor="#666" />
      </linearGradient>
      {/* Tank body gradient */}
      <linearGradient id="glTank" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#e0e0e0" />
        <stop offset="15%" stopColor="#f8f8f8" />
        <stop offset="40%" stopColor="#d0d0d0" />
        <stop offset="60%" stopColor="#b0b0b0" />
        <stop offset="85%" stopColor="#909090" />
        <stop offset="100%" stopColor="#707070" />
      </linearGradient>
      {/* Tank dome highlight */}
      <radialGradient id="glDome" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#f0f0f0" />
        <stop offset="100%" stopColor="#a0a0a0" />
      </radialGradient>
      {/* Cyan sphere (cooler/preheater) */}
      <radialGradient id="glCyan" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#e0ffff" />
        <stop offset="25%" stopColor="#67e8f9" />
        <stop offset="55%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0e4f5c" />
      </radialGradient>
      {/* Blue sphere (water) */}
      <radialGradient id="glBlue" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#dbeafe" />
        <stop offset="30%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a5f" />
      </radialGradient>
      {/* Valve metallic */}
      <linearGradient id="glValve" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#e8e8e8" />
        <stop offset="50%" stopColor="#a0a0a0" />
        <stop offset="100%" stopColor="#666" />
      </linearGradient>
      {/* Gauge rim */}
      <linearGradient id="glGaugeRim" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#333" />
        <stop offset="100%" stopColor="#111" />
      </linearGradient>
    </defs>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D PIPE — Grey cylindrical pipe + colored dashed flow line
   GenLogic style: thick grey pipe body, thin colored dash inside
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLPipe3D({ d, flowColor = '#06b6d4', thick = 14, showFlow = true }) {
  return (
    <g>
      {/* Outer shadow */}
      <path d={d} fill="none" stroke="#555" strokeWidth={thick + 4} strokeLinejoin="round" strokeLinecap="round" opacity="0.3" />
      {/* Pipe body - grey metallic */}
      <path d={d} fill="none" stroke="url(#glPipeH)" strokeWidth={thick} strokeLinejoin="round" strokeLinecap="round" />
      {/* Highlight on top */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={Math.max(2, thick * 0.2)} strokeLinejoin="round" strokeLinecap="round" transform="translate(0,-2)" />
      {/* Colored dashed flow line */}
      {showFlow && (
        <path d={d} fill="none" stroke={flowColor} strokeWidth="3" strokeDasharray="10 6" strokeLinejoin="round" strokeLinecap="round" style={{ animation: 'scada-pipe-flow 1.2s linear infinite' }} />
      )}
    </g>
  )
}

/* 2D pipe: simple colored line with flow dash */
export function GLPipe2D({ d, color = '#000', dash = true, thick = 5 }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={thick} strokeLinejoin="miter" />
      {dash && <path d={d} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="8 6" strokeLinejoin="miter" />}
    </g>
  )
}

/* Pipe flange/connector (small rectangle at junction) */
export function GLFlange({ x, y, vertical = false }) {
  return vertical
    ? <rect x={x - 10} y={y - 3} width="20" height="6" fill="#888" stroke="#555" strokeWidth="1" />
    : <rect x={x - 3} y={y - 10} width="6" height="20" fill="#888" stroke="#555" strokeWidth="1" />
}

/* Flow arrow triangle */
export function GLArrow({ x, y, dir = 'right', color = '#000', size = 10 }) {
  const s = size
  const pts = {
    right: `${x},${y} ${x - s},${y - s / 2} ${x - s},${y + s / 2}`,
    left: `${x},${y} ${x + s},${y - s / 2} ${x + s},${y + s / 2}`,
    down: `${x},${y} ${x - s / 2},${y - s} ${x + s / 2},${y - s}`,
    up: `${x},${y} ${x - s / 2},${y + s} ${x + s / 2},${y + s}`,
  }
  return <polygon points={pts[dir]} fill={color} />
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALVE — 3D metallic bowtie with red handle knob
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLValve3D({ x, y, pct, labelPos = 'bottom' }) {
  const label = `${Math.round(pct * 100)}%`
  const ly = labelPos === 'top' ? -32 : 18
  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}>
      {/* Left triangle */}
      <path d="M-16,-12 L0,0 L-16,12 Z" fill="url(#glValve)" stroke="#555" strokeWidth="1.5" />
      {/* Right triangle */}
      <path d="M16,-12 L0,0 L16,12 Z" fill="url(#glValve)" stroke="#555" strokeWidth="1.5" />
      {/* Stem */}
      <rect x="-3" y="-24" width="6" height="12" fill="#888" stroke="#555" strokeWidth="1" />
      {/* Red handle knob */}
      <circle cx="0" cy="-16" r="7" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
      {/* Handle bar */}
      <rect x="-12" y="-22" width="24" height="4" rx="2" fill="#888" stroke="#555" strokeWidth="1" />
      {/* Percentage label */}
      <rect x="-16" y={ly} width="32" height="14" fill="#fff" stroke="#1d4ed8" strokeWidth="1" />
      <text x="0" y={ly + 11} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8" fontStyle="italic">{label}</text>
    </g>
  )
}

/* Simple valve (no label) */
export function GLValveSimple({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-14,-10 L0,0 L-14,10 Z" fill="url(#glValve)" stroke="#555" strokeWidth="1.5" />
      <path d="M14,-10 L0,0 L14,10 Z" fill="url(#glValve)" stroke="#555" strokeWidth="1.5" />
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TANK — 3D metallic cylinder with dome caps, flanges, nozzles
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLTank3D({ x, y, w = 80, h = 240, children }) {
  const hw = w / 2, hh = h / 2, dome = 25
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Shadow */}
      <ellipse cx="4" cy={hh + 8} rx={hw + 2} ry="10" fill="rgba(0,0,0,0.15)" />
      {/* Body */}
      <rect x={-hw} y={-hh} width={w} height={h} fill="url(#glTank)" stroke="#888" strokeWidth="1.5" />
      {/* Dome top */}
      <ellipse cx="0" cy={-hh} rx={hw} ry={dome} fill="url(#glDome)" stroke="#888" strokeWidth="1.5" />
      {/* Dome bottom */}
      <ellipse cx="0" cy={hh} rx={hw} ry={dome} fill="#a0a0a0" stroke="#888" strokeWidth="1.5" />
      {/* Specular highlight on body */}
      <rect x={-hw + 8} y={-hh + 10} width="8" height={h - 20} rx="4" fill="rgba(255,255,255,0.35)" />
      {/* Top nozzle */}
      <rect x="-6" y={-hh - dome - 10} width="12" height={dome + 10} fill="#999" stroke="#777" strokeWidth="1" />
      <GLFlange x={0} y={-hh - dome - 10} vertical={true} />
      {/* Bottom nozzle */}
      <rect x="-6" y={hh + dome - 2} width="12" height="14" fill="#999" stroke="#777" strokeWidth="1" />
      {children}
    </g>
  )
}

/* Level bar inside tank (like GenLogic's teal/blue bars) */
export function GLLevelBar({ x, y, w = 18, h = 130, level, color = '#0d9488', showPct = true }) {
  const fillH = level * h
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} fill="#fff" stroke="#000" strokeWidth="1" />
      <rect x={0} y={h - fillH} width={w} height={fillH} fill={color} />
      {showPct && (
        <>
          <rect x={w + 4} y={h / 2 - 8} width="32" height="16" fill="#fff" stroke="#000" strokeWidth="1" />
          <text x={w + 20} y={h / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000" fontStyle="italic">{Math.round(level * 100)}%</text>
        </>
      )}
    </g>
  )
}

/* Scale bar with tick labels (Water Separator style) */
export function GLScaleBar({ x, y, w = 14, h = 160, level, color = '#2563eb' }) {
  const fillH = level * h
  const ticks = [0, 25, 50, 75, 100]
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} fill="#fff" stroke="#000" strokeWidth="1" />
      <rect x={0} y={h - fillH} width={w} height={fillH} fill={color} />
      {ticks.map(t => (
        <g key={t}>
          <line x1={w} y1={h - (t / 100) * h} x2={w + 5} y2={h - (t / 100) * h} stroke="#000" strokeWidth="1" />
          <text x={w + 9} y={h - (t / 100) * h + 4} fontSize="10" fontWeight="bold" fill="#000">{t}</text>
        </g>
      ))}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEPARATOR — Diamond/cone shape
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLSeparator({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Side pipe stubs */}
      <rect x="-62" y="-6" width="8" height="12" fill="#999" stroke="#777" strokeWidth="1" />
      <rect x="54" y="-6" width="8" height="12" fill="#999" stroke="#777" strokeWidth="1" />
      {/* Bottom nozzle */}
      <rect x="-6" y="50" width="12" height="14" fill="#555" />
      {/* Diamond body */}
      <path d="M0,-52 L52,0 L0,52 L-52,0 Z" fill="url(#glTank)" stroke="#888" strokeWidth="2" />
      {/* Highlight */}
      <path d="M-10,-40 L-20,0 L-10,40" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" />
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPHERE — 3D shaded (cooler, preheater, water pump)
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLSphere({ x, y, r = 50, gradId = 'glCyan' }) {
  return <circle cx={x} cy={y} r={r} fill={`url(#${gradId})`} stroke="#555" strokeWidth="2" />
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESSURE GAUGE — Exact GenLogic style
   ═══════════════════════════════════════════════════════════════════════════ */
export function GLPressureGauge({ x, y, pressure }) {
  const angle = pressure * 180 - 90
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="52" fill="url(#glGaugeRim)" stroke="#000" strokeWidth="2" />
      <circle cx="0" cy="0" r="46" fill="#a3e635" />
      <circle cx="0" cy="0" r="38" fill="#fef08a" stroke="#333" strokeWidth="0.5" />
      <path d="M-30,6 A38,38 0 0,1 30,6" fill="none" stroke="#000" strokeWidth="3.5" />
      {[0,1,2,3,4].map(n => {
        const a = (n / 5) * Math.PI - Math.PI
        const tx = Math.cos(a) * 28, ty = Math.sin(a) * 28
        return <text key={n} x={tx} y={ty + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000" fontStyle="italic">{n}</text>
      })}
      <text x="33" y="10" fontSize="11" fontWeight="bold" fill="#ef4444" fontStyle="italic">5</text>
      <g transform={`rotate(${angle})`}>
        <line x1="0" y1="0" x2="28" y2="0" stroke="#ef4444" strokeWidth="3" />
      </g>
      <circle cx="0" cy="0" r="5" fill="#222" />
      <text x="0" y="66" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#ef4444">PRESSURE</text>
      <rect x="-30" y="74" width="60" height="20" fill="#fde047" stroke="#000" strokeWidth="2" />
      <text x="0" y="89" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">{(pressure * 5).toFixed(1)} ATM</text>
    </g>
  )
}

/* Info box */
export function GLInfoBox({ x, y, text, w = 76 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height="22" fill="#fff" stroke="#000" strokeWidth="2" />
      <text x={w / 2} y="16" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">{text}</text>
    </g>
  )
}

/* Flow readout (cyan box) */
export function GLFlowBox({ x, y, value }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="110" height="42" fill="#a5f3fc" stroke="#000" strokeWidth="2" />
      <text x="55" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">FLOW</text>
      <text x="55" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">{value} ft3/hr</text>
    </g>
  )
}

/* Temperature chart */
export function GLTempChart({ x, y, w = 195, h = 90, history }) {
  if (!history || history.length < 2) return null
  const maxV = 150, minV = 50
  const pts = history.map((v, i) => {
    const px = x + (i / (history.length - 1)) * w
    const py = y + h - ((v - minV) / (maxV - minV)) * h
    return `${px},${py}`
  }).join(' ')
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#000" strokeWidth="1" />
      <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">Temperature History</text>
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#ddd" strokeWidth="0.5" />
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" />
    </g>
  )
}
