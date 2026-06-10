import { useState } from 'react'
import { DemoViewerLayout } from '@/components/demo/DemoViewerLayout'
import { SceneFrame, Gradients } from '@/components/demo/IndustrialPrimitives'
import { ModeToggle, useViewMode } from '@/hooks/useViewMode'
import { useSimulationTick } from '@/hooks/useSimulationTick'
import { noisySignal, clamp } from '@/data/mockSignals'

function ModeHeader({ title }) {
  return <div className="mb-3 flex items-center justify-between"><div className="text-xs font-black uppercase tracking-[.18em] text-muted-foreground">{title}</div><ModeToggle /></div>
}

function StdLayout({ demo, canvas, signals, alarms, running, setRunning, reset, widgets, notes }) {
  return <DemoViewerLayout canvas={canvas} side={{ demo, running, setRunning, reset, signals, alarms, widgets, notes }} />
}

export function GISNetwork({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(1000)
  const [sel, setSel] = useState(1)
  const l1 = clamp(noisySignal(sim.step, 45, 12, 1), 10, 95)
  const l2 = clamp(noisySignal(sim.step, 60, 22, 2), 10, 95)
  const l3 = clamp(noisySignal(sim.step, 80, 15, 3), 10, 95)
  const loads = [l1, l2, l3]
  const signals = [
    { id: `TWR-0${sel+1}`, label: 'Selected node load', value: loads[sel].toFixed(0), unit: '%', status: loads[sel] > 85 ? 'warning' : 'normal' },
    { id: 'LINK-A', label: 'Backhaul latency', value: clamp(noisySignal(sim.step, 14, 5, 9), 8, 45).toFixed(0), unit: 'ms', status: 'normal' },
  ]
  const canvas = <SceneFrame title="Regional Asset Map"><ModeHeader title="Network topology" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#e6f4f1] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><path d="M100 280 L490 80 L880 280 L490 480 Z" fill="#d1fae5" stroke="#a7f3d0" strokeWidth="2" opacity=".6" /><path d="M100 290 L490 90 L880 290 L490 490 Z" fill="#a7f3d0" opacity=".4" />{[ {x:320,y:260}, {x:490,y:200}, {x:660,y:310} ].map((p, i) => <g key={i} onClick={()=>setSel(i)} style={{cursor:'pointer'}} filter="url(#softShadow)"><path d={`M${p.x} ${p.y} L${p.x-15} ${p.y+30} L${p.x+15} ${p.y+30} Z`} fill="url(#steel)" stroke="#64748b" /><circle cx={p.x} cy={p.y-5} r="6" fill={loads[i] > 85 ? '#f59e0b' : '#38bdf8'} /><ellipse cx={p.x} cy={p.y+30} rx="15" ry="5" fill="#0f172a" opacity=".2" /></g>)}<path d="M320 260 L490 200 L660 310" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="8 6" style={{ animation: `scada-pipe-flow 1s linear infinite` }} /></> : <><rect x="100" y="80" width="780" height="400" fill="none" stroke="#cbd5e1" strokeWidth="3" rx="20" />{[ {x:320,y:260}, {x:490,y:200}, {x:660,y:310} ].map((p, i) => <g key={i} onClick={()=>setSel(i)} style={{cursor:'pointer'}}><circle cx={p.x} cy={p.y} r="18" fill="none" stroke="#334155" strokeWidth="3" /><text x={p.x} y={p.y+5} textAnchor="middle" fontSize="11" fontWeight="900" fill="#334155">{i+1}</text></g>)}<path d="M338 260 L472 200 M508 200 L642 310" fill="none" stroke="#64748b" strokeWidth="2" /></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['Isometric Map Plane', '3D Tower Marker', 'Animated Link', 'Clickable Node']} notes={['Map drawn as a skewed polygon for 3D perspective.', 'Towers are simple layered SVG paths with drop shadows.', '2D mode reverts to a flat topological network diagram.']} />
}

export function ExecIndustrial({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(1200)
  const oee = clamp(noisySignal(sim.step, 88, 6, 2), 65, 96)
  const nOut = clamp(noisySignal(sim.step, 4500, 300, 1), 2000, 6000)
  const sOut = clamp(noisySignal(sim.step, 3800, 400, 5), 1000, 5000)
  const signals = [ { id: 'KPI-OEE', label: 'Global OEE', value: oee.toFixed(1), unit: '%', status: oee > 82 ? 'normal' : 'warning' }, { id: 'KPI-OUT', label: 'Total Output', value: (nOut + sOut).toFixed(0), unit: 'u', status: 'normal' } ]
  const canvas = <SceneFrame title="Executive Management Board"><ModeHeader title="Multi-site overview" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-slate-900 dark:to-slate-950"><Gradients />{mode === '3D' ? <><g filter="url(#softShadow)"><rect x="140" y="240" width="300" height="200" rx="16" fill="url(#steel)" stroke="#cbd5e1" /><path d="M180 340 L240 280 L280 320 L380 260 L400 380 Z" fill="rgba(14,165,233,.2)" stroke="#0ea5e9" strokeWidth="3" /><text x="290" y="410" textAnchor="middle" fontSize="16" fontWeight="900" fill="#334155">NORTH PLANT</text></g><g filter="url(#softShadow)"><rect x="540" y="240" width="300" height="200" rx="16" fill="url(#steel)" stroke="#cbd5e1" /><path d="M580 320 L620 290 L680 340 L760 270 L780 380 Z" fill="rgba(34,197,94,.2)" stroke="#22c55e" strokeWidth="3" /><text x="690" y="410" textAnchor="middle" fontSize="16" fontWeight="900" fill="#334155">SOUTH PLANT</text></g><rect x="140" y="100" width="700" height="100" rx="12" fill="white" filter="url(#smallShadow)" /><text x="490" y="160" textAnchor="middle" fontSize="36" fontWeight="900" fill="#0f172a">{(nOut+sOut).toFixed(0)} UNITS</text></> : <><rect x="140" y="240" width="300" height="200" rx="16" fill="none" stroke="#334155" strokeWidth="4" /><text x="290" y="340" textAnchor="middle" fontSize="16" fontWeight="900" fill="#334155">NORTH PLANT</text><rect x="540" y="240" width="300" height="200" rx="16" fill="none" stroke="#334155" strokeWidth="4" /><text x="690" y="340" textAnchor="middle" fontSize="16" fontWeight="900" fill="#334155">SOUTH PLANT</text><rect x="140" y="100" width="700" height="100" rx="12" fill="none" stroke="#334155" strokeWidth="4" /><text x="490" y="160" textAnchor="middle" fontSize="36" fontWeight="900" fill="#334155">{(nOut+sOut).toFixed(0)} UNITS</text></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['3D KPI Card', 'Embedded Trend', 'Gradient Background']} notes={['Executive view uses softer steel gradients instead of raw pipes.', 'Cards pop via robust SVG drop-shadow filters.', '2D mode flattens to clean wireframes.']} />
}
