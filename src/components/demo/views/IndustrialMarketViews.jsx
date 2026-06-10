import { useState } from 'react'
import { SolventRecoveryScene } from '@/components/demo/SolventRecovery'
import { DemoViewerLayout } from '@/components/demo/DemoViewerLayout'
import { SceneFrame, Gradients, Pipe3D, Pipe2D, Tank3D, Tank2D, Pump3D, Pump2D, Valve3D, Valve2D, Conveyor3D, Panel3D } from '@/components/demo/IndustrialPrimitives'
import { ModeToggle, useViewMode } from '@/hooks/useViewMode'
import { useSimulationTick } from '@/hooks/useSimulationTick'
import { makeIndustrialSnapshot, noisySignal, clamp, stateFromThresholds } from '@/data/mockSignals'

function ModeHeader({ title }) {
  return <div className="mb-3 flex items-center justify-between"><div className="text-xs font-black uppercase tracking-[.18em] text-muted-foreground">{title}</div><ModeToggle /></div>
}

function StdLayout({ demo, canvas, signals, alarms, running, setRunning, reset, widgets, notes }) {
  return <DemoViewerLayout canvas={canvas} side={{ demo, running, setRunning, reset, signals, alarms, widgets, notes }} />
}

export function MfgMixing({ demo }) {
  // Delegate to dedicated GenLogic-faithful component
  return <SolventRecoveryScene demo={demo} />
}

/* removed legacy fallback implementation
function MfgMixing_UNUSED_OMITTED({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(850)
  const data = makeIndustrialSnapshot(sim.step)
  
  const p1 = (data.pressure / 10).toFixed(1);
  const f1 = (data.flow * 5 + 2000).toFixed(1);
  const t1 = (120 + (data.temperature - 60)).toFixed(0);
  const t2 = (67 + (data.temperature - 60) * 0.5).toFixed(0);
  const vapLevel = (100 - (data.tank * 0.4));
  const watLevel = (data.tank * 0.8 + 10);
  
  const signals = [
    { id: 'FIT-101', label: 'Feed Flow', value: f1, unit: 'ft³/hr', status: data.states.flow },
    { id: 'PIT-201', label: 'System Pressure', value: p1, unit: 'ATM', status: data.states.pressure },
    { id: 'TIT-201', label: 'Vaporizer Temp', value: t1, unit: '°C', status: data.states.temperature },
  ]
  const alarms = data.states.temperature === 'alarm' ? [{ id: 'TIT-201-HH', status: 'alarm', message: 'Vaporizer temperature exceeds critical limit' }] : []

  const canvas = (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#dcdcdc] shadow-sm relative h-[650px]">
      <svg viewBox="0 0 980 650" className="w-full h-full">
        <defs>
          <linearGradient id="genlogicGrey" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="25%" stopColor="#cbd5e1"/>
            <stop offset="75%" stopColor="#94a3b8"/>
            <stop offset="100%" stopColor="#64748b"/>
          </linearGradient>
          <radialGradient id="sphereCyan" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#cffafe"/>
            <stop offset="30%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#083344"/>
          </radialGradient>
          <radialGradient id="sphereBlue" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#bfdbfe"/>
            <stop offset="30%" stopColor="#0284c7"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </radialGradient>
          <linearGradient id="gaugeRim" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#1e293b"/>
            <stop offset="100%" stopColor="#020617"/>
          </linearGradient>
        </defs>

        <g transform="translate(30, 20)">
          <rect x="4" y="4" width="340" height="26" fill="#000" />
          <rect x="0" y="0" width="340" height="26" fill="#0891b2" stroke="#000" strokeWidth="2" />
          <text x="170" y="18" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">SOLVENT RECOVERY SYSTEM</text>
        </g>
        <g transform="translate(740, 30)">
          <rect x="3" y="3" width="160" height="42" fill="#000" />
          <rect x="0" y="0" width="160" height="42" fill="#fff" stroke="#000" strokeWidth="2" />
          <text x="80" y="16" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">Generic Logic, Inc.</text>
          <text x="80" y="32" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1d4ed8">www.genlogic.com</text>
        </g>

        <PipeGenLogic d="M 30 180 H 130" color="#000" />
        <polygon points="70,180 60,175 60,185" fill="#000" />

        <PipeGenLogic d="M 270 180 H 300 V 260 H 360" color="#ca8a04" />
        <polygon points="320,260 310,255 310,265" fill="#ca8a04" />

        <PipeGenLogic d="M 200 240 V 280 H 140 V 460 H 190" color="#06b6d4" />
        <polygon points="140,360 135,350 145,350" fill="#06b6d4" />

        <PipeGenLogic d="M 200 280 V 360 H 80 V 500" color="#000" dashColor="none" thick={false} />
        <polygon points="80,500 75,490 85,490" fill="#000" />

        <PipeGenLogic d="M 400 160 V 130 H 620 V 230" color="#ca8a04" />
        <polygon points="520,130 510,125 510,135" fill="#ca8a04" />

        <PipeGenLogic d="M 620 60 H 560 V 240 H 440" color="#dc2626" />
        <polygon points="560,160 555,150 565,150" fill="#dc2626" />

        <PipeGenLogic d="M 400 400 V 460 H 290" color="#06b6d4" />
        <polygon points="340,460 350,455 350,465" fill="#06b6d4" />

        <PipeGenLogic d="M 670 280 H 780" color="#22c55e" />
        <polygon points="720,280 710,275 710,285" fill="#22c55e" />

        <PipeGenLogic d="M 820 160 V 130 H 920" color="#22c55e" />
        <polygon points="880,130 870,125 870,135" fill="#22c55e" />

        <PipeGenLogic d="M 820 400 V 440 H 850" color="#000" dashColor="none" thick={false} />
        <polygon points="840,440 830,435 830,445" fill="#000" />

        <PipeGenLogic d="M 910 440 H 960" color="#000" dashColor="none" thick={false} />
        
        <PipeGenLogic d="M 620 330 V 480 H 920" color="#b45309" />
        <polygon points="860,480 850,475 850,485" fill="#b45309" />

        <PipeGenLogic d="M 570 420 L 600 320" color="#0284c7" />
        <polygon points="590,353 583,360 594,363" fill="#0284c7" />

        <PipeGenLogic d="M 290 460 H 380 V 520 H 220" color="#000" dashColor="none" thick={false} />

        <PipeGenLogic d="M 400 400 V 540 H 260" color="#000" dashColor="none" thick={false} />

        <g transform="translate(200, 180)">
          <rect x="-70" y="-10" width="10" height="20" fill="#94a3b8" stroke="#334155" />
          <rect x="60" y="-10" width="10" height="20" fill="#94a3b8" stroke="#334155" />
          <rect x="-10" y="60" width="20" height="10" fill="#1e293b" />
          <path d="M 0 -60 L 60 0 L 0 60 L -60 0 Z" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
        </g>

        <g transform="translate(400, 280)">
          <path d="M -40 -120 C -40 -150 40 -150 40 -120" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <rect x="-40" y="-120" width="80" height="240" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <path d="M -40 120 C -40 150 40 150 40 120" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <rect x="-10" y="-130" width="20" height="20" fill="#1e293b" />
          <rect x="-10" y="110" width="20" height="20" fill="#1e293b" />
          <rect x="40" y="-50" width="10" height="20" fill="#1e293b" />
          <rect x="-50" y="110" width="10" height="20" fill="#1e293b" />

          <rect x="-20" y="-60" width="20" height="140" fill="#fff" stroke="#000" strokeWidth="1" />
          <rect x="-20" y={80 - (vapLevel / 100 * 140)} width="20" height={(vapLevel / 100 * 140)} fill="#0d9488" />
          <rect x="5" y="0" width="30" height="16" fill="#fff" stroke="#000" strokeWidth="1" />
          <text x="20" y="12" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">{vapLevel.toFixed(0)}%</text>
        </g>

        <g transform="translate(820, 280)">
          <path d="M -40 -120 C -40 -150 40 -150 40 -120" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <rect x="-40" y="-120" width="80" height="240" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <path d="M -40 120 C -40 150 40 150 40 120" fill="url(#genlogicGrey)" stroke="#334155" strokeWidth="2" />
          <rect x="-10" y="-130" width="20" height="20" fill="#1e293b" />
          <rect x="-10" y="110" width="20" height="20" fill="#1e293b" />

          <rect x="-25" y="-100" width="16" height="160" fill="#fff" stroke="#000" strokeWidth="1" />
          <rect x="-25" y={60 - (watLevel / 100 * 160)} width="16" height={(watLevel / 100 * 160)} fill="#2563eb" />
          <text x="-30" y="-95" textAnchor="end" fontSize="9" fontWeight="bold" fill="#000">100</text>
          <text x="-30" y="-55" textAnchor="end" fontSize="9" fontWeight="bold" fill="#000">75</text>
          <text x="-30" y="-15" textAnchor="end" fontSize="9" fontWeight="bold" fill="#000">50</text>
          <text x="-30" y="25" textAnchor="end" fontSize="9" fontWeight="bold" fill="#000">25</text>
          <text x="-30" y="65" textAnchor="end" fontSize="9" fontWeight="bold" fill="#000">0</text>
        </g>

        <circle cx="620" cy="280" r="50" fill="url(#sphereCyan)" stroke="#334155" strokeWidth="2" />
        <circle cx="240" cy="460" r="50" fill="url(#sphereCyan)" stroke="#334155" strokeWidth="2" />
        <circle cx="880" cy="440" r="30" fill="url(#sphereBlue)" stroke="#334155" strokeWidth="2" />

        <g transform="translate(285, 180)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#000" />
          <circle cx="0" cy="-12" r="6" fill="#ef4444" />
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#000" strokeWidth="2" />
          <rect x="-14" y="10" width="28" height="14" fill="#fff" stroke="#1d4ed8" strokeWidth="1" />
          <text x="0" y="21" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">{sim.running ? "100%" : "0%"}</text>
        </g>

        <g transform="translate(510, 240)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#000" />
          <circle cx="0" cy="-12" r="6" fill="#ef4444" />
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#000" strokeWidth="2" />
          <rect x="-14" y="10" width="28" height="14" fill="#fff" stroke="#1d4ed8" strokeWidth="1" />
          <text x="0" y="21" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">{sim.running ? "90%" : "0%"}</text>
        </g>

        <g transform="translate(580, 400)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#fff" stroke="#000" strokeWidth="1" />
          <circle cx="0" cy="-12" r="6" fill="#ef4444" />
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#000" strokeWidth="2" />
          <rect x="-14" y="10" width="28" height="14" fill="#fff" stroke="#1d4ed8" strokeWidth="1" />
          <text x="0" y="21" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">{sim.running ? "25%" : "0%"}</text>
        </g>

        <g transform="translate(930, 440)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#fff" stroke="#000" strokeWidth="1" />
          <circle cx="0" cy="-12" r="6" fill="#ef4444" />
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#000" strokeWidth="2" />
          <rect x="-14" y="-30" width="28" height="14" fill="#fff" stroke="#1d4ed8" strokeWidth="1" />
          <text x="0" y="-19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">0%</text>
        </g>

        <g transform="translate(400, 480)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#000" />
        </g>

        <g transform="translate(750, 440)">
          <path d="M -12 -10 L 12 10 L 12 -10 L -12 10 Z" fill="#000" />
        </g>

        <g transform="translate(840, 160)">
          <rect x="0" y="0" width="100" height="40" fill="#a5f3fc" stroke="#000" strokeWidth="2" />
          <text x="50" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">FLOW</text>
          <text x="50" y="32" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">{f1} ft3/hr</text>
        </g>

        <g transform="translate(490, 200)">
          <rect x="0" y="0" width="70" height="22" fill="#fff" stroke="#000" strokeWidth="2" />
          <text x="35" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">T={t1} C</text>
        </g>
        <g transform="translate(880, 260)">
          <rect x="0" y="0" width="70" height="22" fill="#fff" stroke="#000" strokeWidth="2" />
          <text x="35" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">T={t2} C</text>
        </g>
        <g transform="translate(160, 560)">
          <rect x="0" y="0" width="70" height="22" fill="#fff" stroke="#000" strokeWidth="2" />
          <text x="35" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">T=80 C</text>
        </g>

        <g transform="translate(460, 420)">
          <circle cx="0" cy="0" r="54" fill="url(#gaugeRim)" stroke="#020617" strokeWidth="3" />
          <circle cx="0" cy="0" r="48" fill="#a3e635" stroke="#0f172a" strokeWidth="1" />
          <circle cx="0" cy="0" r="40" fill="#fef08a" stroke="#000" strokeWidth="1" />
          <path d="M-30,10 A40,40 0 0,1 30,10" fill="none" stroke="#000" strokeWidth="5" />
          
          <text x="-26" y="-12" fontSize="10" fill="#000" fontWeight="bold">0</text>
          <text x="-16" y="-26" fontSize="10" fill="#000" fontWeight="bold">1</text>
          <text x="0" y="-32" textAnchor="middle" fontSize="10" fill="#000" fontWeight="bold">2</text>
          <text x="16" y="-26" fontSize="10" fill="#000" fontWeight="bold">3</text>
          <text x="26" y="-12" fontSize="10" fill="#000" fontWeight="bold">4</text>
          <text x="34" y="8" fontSize="10" fill="#ef4444" fontWeight="bold">5</text>
          
          <g transform={`rotate(${p1 * 36 - 90})`}>
             <line x1="0" y1="0" x2="30" y2="0" stroke="#ef4444" strokeWidth="3" />
          </g>
          <circle cx="0" cy="0" r="6" fill="#000" />
          
          <text x="0" y="70" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#ef4444">PRESSURE</text>
          <rect x="-35" y="80" width="70" height="24" fill="#fde047" stroke="#000" strokeWidth="2" />
          <text x="0" y="97" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">{p1} ATM</text>
        </g>

        <text x="100" y="160" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">DIRTY WET</text>
        <text x="100" y="176" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>

        <text x="200" y="110" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SEPARATOR</text>
        
        <text x="400" y="130" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="400" y="146" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">VAPOR</text>

        <text x="520" y="160" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="520" y="176" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">VAPORIZER</text>

        <text x="620" y="210" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="620" y="226" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">COOLER</text>

        <text x="740" y="140" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">WATER</text>
        <text x="740" y="156" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SEPARATOR</text>

        <text x="880" y="110" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">RECLAIMED SOLVENT</text>
        <text x="620" y="50" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">STEAM</text>
        
        <text x="800" y="440" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">WATER</text>
        <text x="840" y="470" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">CONDENSATE</text>
        <text x="640" y="430" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">COOLING</text>
        <text x="640" y="446" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">WATER</text>

        <text x="320" y="480" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">HEATED</text>
        <text x="320" y="496" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="320" y="530" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SLUDGE</text>

        <text x="140" y="500" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="140" y="516" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">PREHEATER</text>

        <text x="80" y="520" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SEDIMENT</text>

        <g transform="translate(680, 500)">
          <rect x="0" y="0" width="160" height="30" fill="#fff" stroke="#1d4ed8" strokeWidth="2" />
          <text x="80" y="12" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">Left-click on valves to open,</text>
          <text x="80" y="24" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1d4ed8">right-click to close.</text>
        </g>
        
        <g transform="translate(930, 520)">
           <rect x="0" y="0" width="30" height="30" rx="8" fill="#e2e8f0" stroke="#94a3b8" />
           <path d="M 5 15 L 10 5 L 15 25 L 20 15 L 25 10" fill="none" stroke="#ef4444" strokeWidth="2" />
        </g>

      </svg>
    </div>
  )

  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={alarms} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['GenLogic Exact Replica']} notes={['Recreated exactly as the reference 3D image.']} />
}
*/

export function WaterDistribution({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(1000)
  const data = makeIndustrialSnapshot(sim.step)
  const turbidity = clamp(noisySignal(sim.step, 1.6, 1.2, 8), .2, 5)
  const signals = [{ id: 'RES-LVL', label: 'Main reservoir', value: data.tank.toFixed(0), unit: '%', status: data.states.tank }, { id: 'TDS-01', label: 'TDS', value: '142', unit: 'ppm', status: 'normal' }, { id: 'TURB', label: 'Turbidity', value: turbidity.toFixed(2), unit: 'NTU', status: turbidity > 3 ? 'warning' : 'normal' }]
  const canvas = <SceneFrame title="PAM Distribution Reservoir"><ModeHeader title="Reservoir / pump house" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#eaf7ff] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><Pipe3D d="M180 310H390V230H615V365H850" color="pipeBlue" /><Pipe3D d="M615 365V455H760" color="pipeGreen" /><Tank3D x="165" y="305" label="RES-01" level={data.tank} liquid="#38bdf8" scale={1.25} /><Tank3D x="390" y="230" label="CLAR" level={72} liquid="#93c5fd" scale={.88} /><Pump3D x="555" y="230" label="PMP-A" running={sim.running} color="#0ea5e9" /><Valve3D x="615" y="365" label="ZV-A" open={85} /><Tank3D x="850" y="365" label="ZONE-A" level={58} liquid="#67e8f9" scale={.9} /><Tank3D x="760" y="455" label="ZONE-B" level={44} liquid="#67e8f9" scale={.75} /></> : <><Pipe2D d="M180 310H390V230H615V365H850" /><Pipe2D d="M615 365V455H760" color="#16a34a" /><Tank2D x="165" y="305" label="RES-01" level={data.tank} /><Tank2D x="390" y="230" label="CLAR" level={72} /><Pump2D x="555" y="230" label="PMP-A" /><Valve2D x="615" y="365" label="ZV-A" /><Tank2D x="850" y="365" label="ZONE-A" level={58} /></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[{ id: 'WQ-OK', status: turbidity > 3 ? 'warning' : 'normal', message: turbidity > 3 ? 'Turbidity drifting above quality target' : 'Water quality within specification' }]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['Reservoir', 'Clarifier', 'Zone Valve', 'Pump House']} notes={['3D mode emphasizes civil reservoirs and pump-room depth.', '2D mode converts network to clear distribution lines.', 'Quality tags are grouped separate from hydraulic tags.']} />
}

export function PowerSubstation({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(1000)
  const [closed, setClosed] = useState(true)
  const v = closed ? clamp(noisySignal(sim.step, 150, 12, 1), 120, 170) : 0
  const cur = closed ? clamp(noisySignal(sim.step, 620, 210, 4), 120, 980) : 0
  const state = stateFromThresholds(cur, { warningHi: 820, alarmHi: 930 })
  const signals = [{ id: 'HV-BUS', label: 'High voltage bus', value: v.toFixed(1), unit: 'kV', status: closed ? 'normal' : 'offline' }, { id: 'TR-CUR', label: 'Transformer current', value: cur.toFixed(0), unit: 'A', status: state }]
  const canvas = <SceneFrame title="PLN Substation Overview"><ModeHeader title="Transformer yard" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#f6f2e7] dark:bg-slate-950"><Gradients />{mode === '3D' ? <><Pipe3D d="M90 120H880" color="pipeAmber" width={12} flow={false} /><Panel3D x="235" y="315" label="CB-150" status={state} /><Panel3D x="430" y="315" label="TR-01" status={state} w={125} h={155} /><Panel3D x="650" y="315" label="SWGR" status={closed ? 'normal' : 'offline'} /><path d="M235 190V250M430 190V235M650 190V250" stroke="#92400e" strokeWidth="8" strokeLinecap="round" /><g onClick={() => setClosed(!closed)} style={{ cursor: 'pointer' }}><rect x="178" y="180" width="115" height="34" rx="8" fill={closed ? '#22c55e' : '#64748b'} /><text x="235" y="202" textAnchor="middle" fontSize="12" fontWeight="900" fill="white">BREAKER {closed ? 'ON' : 'OFF'}</text></g></> : <><Pipe2D d="M90 120H880" color="#d97706" flow={false} /><path d="M235 120V315M430 120V315M650 120V315" stroke="#334155" strokeWidth="4" /><rect x="205" y="290" width="60" height="50" fill="none" stroke="#334155" strokeWidth="3" /><circle cx="430" cy="315" r="42" fill="none" stroke="#334155" strokeWidth="3" /><rect x="610" y="290" width="80" height="55" fill="none" stroke="#334155" strokeWidth="3" /></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[{ id: 'TR-LOAD', status: state, message: state === 'normal' ? 'Transformer loading nominal' : 'Transformer load above normal band' }]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['3D Transformer', 'Breaker', 'Busbar', 'Switchgear']} notes={['3D view models outdoor yard equipment with perspective panel bodies.', 'Click the breaker pill to simulate open/close.', '2D mode switches to classic single-line notation.']} />
}

export function PowerFeeder({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(900)
  const loads = [0, 1, 2, 3].map(i => clamp(noisySignal(sim.step, 74, 28, i * 7), 10, 98))
  const signals = loads.map((l, i) => ({ id: `FDR-${i + 1}`, label: `Feeder ${i + 1} load`, value: l.toFixed(0), unit: '%', status: l > 88 ? 'alarm' : l > 76 ? 'warning' : 'normal' }))
  const canvas = <SceneFrame title="Distribution Feeder Panels"><ModeHeader title="LV / MV load centre" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#f7f7ef] dark:bg-slate-950"><Gradients />{mode === '3D' ? <>{loads.map((l, i) => <Panel3D key={i} x={170 + i * 210} y={285} label={`PANEL-${i+1}`} status={l > 88 ? 'alarm' : l > 76 ? 'warning' : 'normal'} w={135} h={190} />)}<Pipe3D d="M95 130H890" color="pipeAmber" width={14} flow={false} />{loads.map((_, i) => <path key={i} d={`M${170 + i * 210} 130V178`} stroke="#d97706" strokeWidth="8" strokeLinecap="round" />)}</> : <><Pipe2D d="M95 130H890" color="#d97706" flow={false} />{loads.map((l, i) => <g key={i}><path d={`M${170 + i * 210} 130V360`} stroke="#334155" strokeWidth="4"/><rect x={130 + i * 210} y="295" width="80" height="95" fill="none" stroke="#334155" strokeWidth="3"/><text x={170 + i * 210} y="345" textAnchor="middle" fontSize="13" fontWeight="900">{l.toFixed(0)}%</text></g>)}</>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={signals.filter(s=>s.status!=='normal').map(s=>({id:s.id,status:s.status,message:`${s.label} ${s.value}%`}))} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['3D Electrical Panel', 'Status Lamp', 'Busbar', 'Digital Meter']} notes={['Panels use depth and lamp indicators instead of flat rectangles.', '2D mode returns to feeder panel schematic.', 'Each panel group maps one feeder load tag.']} />
}

export function OilGasTankFarm({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(800)
  const l1 = clamp(noisySignal(sim.step, 82, 11, 2), 15, 95)
  const l2 = clamp(noisySignal(sim.step, 45, 14, 8), 15, 95)
  const flow = clamp(noisySignal(sim.step, 240, 60, 4), 0, 300)
  const signals = [
    { id: 'TK-101', label: 'Crude storage A', value: l1.toFixed(0), unit: '%', status: stateFromThresholds(l1, { warningHi: 88, alarmHi: 92 }) },
    { id: 'TK-102', label: 'Crude storage B', value: l2.toFixed(0), unit: '%', status: stateFromThresholds(l2, { warningHi: 88, alarmHi: 92 }) },
    { id: 'XFER', label: 'Transfer rate', value: flow.toFixed(0), unit: 'bbl/h', status: flow > 280 ? 'warning' : 'normal' }
  ]
  const canvas = <SceneFrame title="Terminal Tank Farm"><ModeHeader title="Manifold & storage" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#f8f5ec] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><Pipe3D d="M210 390V460H715V390" color="oil" width={20} /><Pipe3D d="M465 460V515H880" color="oil" width={22} /><Tank3D x="210" y="275" label="TK-101" level={l1} liquid="#b45309" scale={1.5} /><Tank3D x="715" y="275" label="TK-102" level={l2} liquid="#b45309" scale={1.5} /><Pump3D x="465" y="460" label="PMP-XFER" running={sim.running} color="#d97706" /><Valve3D x="340" y="460" label="MV-1" open={100} /><Valve3D x="590" y="460" label="MV-2" open={100} /></> : <><Pipe2D d="M210 390V460H715V390" color="#b45309" /><Pipe2D d="M465 460V515H880" color="#b45309" /><Tank2D x="210" y="275" label="TK-101" level={l1} /><Tank2D x="715" y="275" label="TK-102" level={l2} /><Pump2D x="465" y="460" label="PMP-XFER" /><Valve2D x="340" y="460" label="MV-1" /><Valve2D x="590" y="460" label="MV-2" /></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[{ id: 'FLOW-OK', status: 'normal', message: 'Manifold flow within limits' }]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['Large Storage Tank', 'Manifold Pipeline', 'Transfer Pump', 'Manual Valve']} notes={['Large scale 3D tanks use scaled generic components.', 'Oil pipeline uses custom dark amber gradient.', '2D switches to clear P&ID outlines.']} />
}

export function HVACChiller({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(950)
  const [pmp, setPmp] = useState(true)
  const chw = pmp ? clamp(noisySignal(sim.step, 6.5, 2.2, 5), 5.5, 9.2) : 24
  const cwr = pmp ? clamp(noisySignal(sim.step, 12.4, 3.1, 9), 10, 16) : 24
  const signals = [
    { id: 'CHW-S', label: 'Chilled water supply', value: chw.toFixed(1), unit: '°C', status: stateFromThresholds(chw, { warningHi: 8, alarmHi: 10 }) },
    { id: 'CHW-R', label: 'Chilled water return', value: cwr.toFixed(1), unit: '°C', status: 'normal' },
    { id: 'PMP-1', label: 'Primary pump', value: pmp ? 'RUN' : 'STOP', unit: '', status: pmp ? 'normal' : 'offline' },
  ]
  const canvas = <SceneFrame title="Central Chiller Plant"><ModeHeader title="BMS equipment screen" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#edf7f6] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><Pipe3D d="M120 180H420V310" color="pipeBlue" /><Pipe3D d="M420 380V470H880" color="pipeGreen" /><g filter="url(#softShadow)"><rect x="180" y="270" width="340" height="150" rx="20" fill="url(#darkSteel)" stroke="#334155" strokeWidth="3" /><circle cx="250" cy="345" r="45" fill="url(#steel)" stroke="#64748b" /><circle cx="450" cy="345" r="45" fill="url(#steel)" stroke="#64748b" /><text x="350" y="352" textAnchor="middle" fontSize="16" fontWeight="900" fill="#e2e8f0">CHILLER 1</text></g><g onClick={() => setPmp(!pmp)} style={{ cursor: 'pointer' }}><Pump3D x="280" y="180" label="PMP-PRI" running={pmp} color="#0ea5e9" /></g><Tank3D x="760" y="180" label="CT-01" level={85} liquid="#38bdf8" scale={1.1} /><Pipe3D d="M760 250V310H500" color="pipeGreen" /></> : <><Pipe2D d="M120 180H420V310" color="#0284c7" /><Pipe2D d="M420 380V470H880" color="#16a34a" /><rect x="180" y="270" width="340" height="150" fill="none" stroke="#334155" strokeWidth="4" /><text x="350" y="352" textAnchor="middle" fontSize="16" fontWeight="900" fill="#334155">CHILLER 1</text><g onClick={() => setPmp(!pmp)} style={{ cursor: 'pointer' }}><Pump2D x="280" y="180" label="PMP-PRI" running={pmp} /></g><Tank2D x="760" y="180" label="CT-01" level={85} /><Pipe2D d="M760 250V310H500" color="#16a34a" /></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['3D Chiller Block', 'Cooling Tower', 'Primary Pump', 'CHW Pipes']} notes={['Chiller object is a composite of steel gradients and circles.', 'Click the pump to stop flow; temperatures will equalize.', 'Colour coding: Blue=Supply, Green=Return.']} />
}

export function MfgPackaging({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(700)
  const spd = clamp(noisySignal(sim.step, 320, 45, 11), 0, 400)
  const rej = clamp(noisySignal(sim.step, 2, 2, 8), 0, 15)
  const signals = [
    { id: 'SPD-L1', label: 'Line speed', value: spd.toFixed(0), unit: 'cpm', status: spd < 250 ? 'warning' : 'normal' },
    { id: 'REJ-L1', label: 'Reject rate', value: rej.toFixed(1), unit: '%', status: stateFromThresholds(rej, { warningHi: 4, alarmHi: 8 }) },
  ]
  const canvas = <SceneFrame title="Discrete Packaging Line"><ModeHeader title="Conveyors & Machines" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#f0f4f8] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><Conveyor3D x="80" y="260" w="820" running={sim.running} /><Panel3D x="240" y="200" label="FILLER" status={sim.running ? 'normal' : 'offline'} w={110} h={130} /><Panel3D x="480" y="200" label="CAPPER" status={sim.running ? 'normal' : 'offline'} w={90} h={130} /><Panel3D x="720" y="200" label="PACKER" status={sim.running ? 'normal' : 'offline'} w={140} h={130} /><rect x="240" y="320" width="80" height="28" rx="4" fill="url(#steel)" stroke="#64748b" /><text x="280" y="338" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0f172a">{spd.toFixed(0)} cpm</text></> : <><path d="M80 260H900" stroke="#334155" strokeWidth="6" strokeLinecap="round" strokeDasharray="16 12" style={{ animation: `scada-pipe-flow ${sim.running ? .8 : 0}s linear infinite` }}/><rect x="185" y="135" width="110" height="130" fill="none" stroke="#334155" strokeWidth="3" /><text x="240" y="205" textAnchor="middle" fontSize="13" fontWeight="900" fill="#334155">FILLER</text><rect x="435" y="135" width="90" height="130" fill="none" stroke="#334155" strokeWidth="3" /><text x="480" y="205" textAnchor="middle" fontSize="13" fontWeight="900" fill="#334155">CAPPER</text><rect x="650" y="135" width="140" height="130" fill="none" stroke="#334155" strokeWidth="3" /><text x="720" y="205" textAnchor="middle" fontSize="13" fontWeight="900" fill="#334155">PACKER</text></>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['3D Conveyor', 'Machine Block', 'Digital Counter']} notes={['Conveyor simulates motion with sliding dash/rect arrays.', 'Machine blocks use the generic panel primitive.', '2D mode falls back to simple block diagrams.']} />
}

export function DataCenterRack({ demo }) {
  const { mode } = useViewMode()
  const sim = useSimulationTick(1000)
  const temp = clamp(noisySignal(sim.step, 24, 6, 2), 18, 32)
  const pwr = clamp(noisySignal(sim.step, 140, 45, 9), 50, 220)
  const signals = [
    { id: 'AISLE-T', label: 'Aisle temperature', value: temp.toFixed(1), unit: '°C', status: temp > 28 ? 'warning' : 'normal' },
    { id: 'ROW-P', label: 'Row active power', value: pwr.toFixed(0), unit: 'kW', status: pwr > 190 ? 'warning' : 'normal' },
  ]
  const canvas = <SceneFrame title="IT Rack Layout"><ModeHeader title="Floor tiles & racks" /><svg viewBox="0 0 980 560" className="h-[560px] w-full rounded-xl bg-[#eef7f5] dark:bg-slate-900"><Gradients />{mode === '3D' ? <><g transform="translate(100,140)"><path d="M0 0 L780 0 L710 240 L-70 240 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" /><path d="M-30 110 L740 110" stroke="#cbd5e1" strokeWidth="2" /><path d="M140 0 L70 240 M320 0 L250 240 M500 0 L430 240 M680 0 L610 240" stroke="#cbd5e1" strokeWidth="2" /></g><g filter="url(#softShadow)">{[0,1,2,3].map(i => <g key={i} transform={`translate(${180 + i * 180},160)`}><path d="M0 0 L60 0 L40 160 L-20 160 Z" fill="url(#steel)" stroke="#64748b" /><path d="M60 0 L80 -20 L60 140 L40 160 Z" fill="#94a3b8" stroke="#64748b" /><rect x="-10" y="20" width="40" height="120" rx="2" fill="#0f172a" transform="skewX(-7)" /><circle cx={10 - i * 3} cy="40" r="3" fill="#22c55e" className="scada-blink" /><circle cx={5 - i * 3} cy="80" r="3" fill="#22c55e" className="scada-blink" /><circle cx={0 - i * 3} cy="120" r="3" fill="#22c55e" className="scada-blink" /><text x="-2" y="-10" fontSize="11" fontWeight="900" fill="#334155" transform="skewX(-7)">RK-{i+1}</text></g>)}</g></> : <><rect x="100" y="100" width="780" height="300" fill="none" stroke="#cbd5e1" strokeWidth="2" />{[0,1,2,3].map(i => <rect key={i} x={180 + i * 180} y="160" width="60" height="180" fill="none" stroke="#334155" strokeWidth="3" />)}</>}</svg></SceneFrame>
  return <StdLayout demo={demo} canvas={canvas} signals={signals} alarms={[]} running={sim.running} setRunning={sim.setRunning} reset={sim.reset} widgets={['Isometric Floor', '3D Rack Shape', 'Blinking LED', 'Heat Gradient']} notes={['3D mode uses SVG skewX for isometric pseudo-3D racks.', 'Floor tiles drawn with explicit skewed paths.', '2D mode flattens to a simple top-down / front-face block diagram.']} />
}
