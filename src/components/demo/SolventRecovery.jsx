import { DemoViewerLayout } from '@/components/demo/DemoViewerLayout'
import { useProcessSimulation } from '@/hooks/useProcessSimulation'
import { GLDefs, GLPipe3D, GLArrow, GLValve3D, GLValveSimple, GLSeparator, GLTank3D, GLLevelBar, GLScaleBar, GLSphere, GLPressureGauge, GLInfoBox, GLFlowBox, GLTempChart, GLFlange } from '@/components/demo/GenLogicPrimitives'

export function SolventRecoveryScene({ demo }) {
  const { data: d, running, setRunning, adjustValve } = useProcessSimulation(50)
  const histVals = Array.from({ length: 100 }).map((_, i) =>
    (d.HeaterTemperature * 100 + 50) + Math.sin(i * 0.3) * 5
  )

  const heaterT = (d.HeaterTemperature * 100 + 50).toFixed(0)
  const coolingT = (d.CoolingTemperature * 100 + 20).toFixed(0)
  const preheaterT = (d.PreHeaterTemperature * 80 + 40).toFixed(0)

  const hv = (name, e) => { e.preventDefault(); adjustValve(name, e.button === 2 ? -0.2 : 0.2) }

  const signals = [
    { id: 'FIT-101', label: 'Reclaimed Flow', value: d.OutFlow.toFixed(1), unit: 'ft³/hr', status: d.OutFlow < 1000 ? 'warning' : 'normal' },
    { id: 'PIT-201', label: 'Heater Pressure', value: (d.HeaterPressure * 5).toFixed(1), unit: 'ATM', status: d.HeaterPressure > 0.8 ? 'warning' : 'normal' },
    { id: 'TIT-201', label: 'Heater Temp', value: heaterT, unit: '°C', status: d.HeaterAlarm ? 'alarm' : 'normal' },
  ]
  const alarms = []
  if (d.HeaterAlarm) alarms.push({ id: 'HTR-ALM', status: 'alarm', message: 'Heater level out of range' })
  if (d.WaterAlarm) alarms.push({ id: 'WTR-ALM', status: 'warning', message: 'Water level out of range' })

  const canvas = (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm relative" onContextMenu={e => e.preventDefault()}>
      <svg viewBox="0 0 960 610" className="w-full bg-[#d4d4d4]" style={{ aspectRatio: '960/610' }}>
        <GLDefs />

        {/* ═══ TITLE BAR ═══ */}
        <g transform="translate(22,16)"><rect x="3" y="3" width="310" height="26" fill="#000" /><rect x="0" y="0" width="310" height="26" fill="#0891b2" stroke="#000" strokeWidth="2" /><text x="155" y="18" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#fff">SOLVENT RECOVERY SYSTEM</text></g>
        <g transform="translate(720,16)"><rect x="3" y="3" width="155" height="40" fill="#000" /><rect x="0" y="0" width="155" height="40" fill="#fff" stroke="#000" strokeWidth="2" /><text x="78" y="15" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a">Generic Logic, Inc.</text><text x="78" y="30" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1d4ed8">www.genlogic.com</text></g>

        {/* ═══ 3D PIPES with colored flow lines ═══ */}
        {/* Dirty wet solvent IN */}
        <GLPipe3D d="M 18 220 H 140" flowColor="#000" showFlow={false} />
        <GLArrow x={80} y={220} dir="right" color="#000" size={14} />

        {/* Separator right → Vaporizer (yellow solvent flow) */}
        <GLPipe3D d="M 250 220 H 350" flowColor="#ca8a04" />
        {/* Vertical into vaporizer */}
        <GLPipe3D d="M 350 220 V 290 H 370" flowColor="#ca8a04" />

        {/* Separator bottom → down → left → Preheater (cyan) */}
        <GLPipe3D d="M 195 275 V 320 H 130 V 460" flowColor="#06b6d4" />

        {/* Separator → Sediment out (black thin) */}
        <GLPipe3D d="M 195 320 V 370 H 75 V 490" flowColor="#333" showFlow={false} thick={8} />
        <GLArrow x={75} y={475} dir="down" color="#000" />

        {/* Vaporizer top → vapor out → Cooler (yellow dashed) */}
        <GLPipe3D d="M 410 155 V 125 H 610 V 260" flowColor="#ca8a04" />

        {/* Steam IN (red) */}
        <GLPipe3D d="M 555 55 V 275 H 455" flowColor="#dc2626" />

        {/* Vaporizer bottom → Preheater return (cyan) */}
        <GLPipe3D d="M 410 440 V 460 H 280" flowColor="#06b6d4" />

        {/* Cooler → Water Separator (green) */}
        <GLPipe3D d="M 670 300 H 750" flowColor="#22c55e" />

        {/* Water Sep top → Reclaimed out (green) */}
        <GLPipe3D d="M 795 155 V 125 H 910" flowColor="#22c55e" />
        <GLArrow x={880} y={125} dir="right" color="#22c55e" />

        {/* Water Sep bottom → Water out */}
        <GLPipe3D d="M 795 440 V 470 H 835" flowColor="#333" showFlow={false} thick={8} />

        {/* Water pump → Condensate out */}
        <GLPipe3D d="M 895 470 H 945" flowColor="#333" showFlow={false} thick={8} />

        {/* Condensate line (brown/amber) */}
        <GLPipe3D d="M 610 350 V 540 H 910" flowColor="#b45309" />
        <GLArrow x={820} y={540} dir="right" color="#b45309" />

        {/* Cooling water diagonal (blue) */}
        <GLPipe3D d="M 565 440 L 595 345" flowColor="#0284c7" thick={10} />
        <GLArrow x={585} y={380} dir="up" color="#0284c7" />

        {/* Heated solvent out */}
        <GLPipe3D d="M 280 460 H 380 V 520 H 215" flowColor="#333" showFlow={false} thick={8} />

        {/* Sludge */}
        <GLPipe3D d="M 410 450 V 540 H 250" flowColor="#333" showFlow={false} thick={8} />

        {/* ═══ Pipe flanges at key junctions ═══ */}
        <GLFlange x={140} y={220} />
        <GLFlange x={250} y={220} />
        <GLFlange x={410} y={155} vertical />
        <GLFlange x={555} y={55} vertical />
        <GLFlange x={795} y={155} vertical />

        {/* ═══ EQUIPMENT ═══ */}
        <GLSeparator x={195} y={220} />

        <GLTank3D x={410} y={300} w={80} h={240}>
          <rect x="40" y="-35" width="10" height="16" fill="#777" stroke="#555" strokeWidth="1" />
          <rect x="-50" y="100" width="10" height="16" fill="#777" stroke="#555" strokeWidth="1" />
          <GLLevelBar x={-16} y={-60} w={16} h={120} level={d.HeaterLevel} color="#0d9488" />
        </GLTank3D>

        <GLTank3D x={795} y={300} w={80} h={240}>
          <GLScaleBar x={-30} y={-70} w={14} h={140} level={d.WaterLevel} color="#2563eb" />
        </GLTank3D>

        <GLSphere x={610} y={300} r={52} gradId="glCyan" />
        {/* Dashed flow lines on cooler (like GenLogic) */}
        <circle cx={610} cy={300} r={38} fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="8 5" />
        <path d="M 575 268 L 645 332 M 575 332 L 645 268" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 4" />

        <GLSphere x={230} y={460} r={48} gradId="glCyan" />
        <GLSphere x={865} y={470} r={28} gradId="glBlue" />

        {/* ═══ VALVES ═══ */}
        <g onClick={e => hv('SolventValve', e)} onContextMenu={e => hv('SolventValve', e)}>
          <GLValve3D x={280} y={220} pct={d.SolventValve} />
        </g>
        <g onClick={e => hv('SteamValve', e)} onContextMenu={e => hv('SteamValve', e)}>
          <GLValve3D x={500} y={275} pct={d.SteamValve} />
        </g>
        <g onClick={e => hv('CoolingValve', e)} onContextMenu={e => hv('CoolingValve', e)}>
          <GLValve3D x={570} y={420} pct={d.CoolingValve} />
        </g>
        <g onClick={e => hv('WaterValve', e)} onContextMenu={e => hv('WaterValve', e)}>
          <GLValve3D x={920} y={470} pct={d.WaterValve} labelPos="top" />
        </g>
        <GLValveSimple x={410} y={450} />
        <GLValveSimple x={740} y={470} />

        {/* ═══ DATA READOUTS ═══ */}
        <GLFlowBox x={815} y={150} value={d.OutFlow.toFixed(1)} />
        <GLInfoBox x={470} y={215} text={`T=${heaterT} C`} w={78} />
        <GLInfoBox x={860} y={275} text={`T=${coolingT} C`} w={72} />
        <GLInfoBox x={155} y={530} text={`T=${preheaterT} C`} w={72} />

        <GLPressureGauge x={455} y={470} pressure={d.HeaterPressure} />

        {/* ═══ TEXT LABELS ═══ */}
        <text x="80" y="180" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">DIRTY WET</text>
        <text x="80" y="196" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="195" y="148" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SEPARATOR</text>
        <text x="380" y="125" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="380" y="141" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">VAPOR</text>
        <text x="500" y="185" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="500" y="201" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">VAPORIZER</text>
        <text x="555" y="45" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">STEAM</text>
        <text x="610" y="238" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="610" y="253" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">COOLER</text>
        <text x="720" y="155" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">WATER</text>
        <text x="720" y="170" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">SEPARATOR</text>
        <text x="875" y="110" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">RECLAIMED SOLVENT</text>
        <text x="75" y="505" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">SEDIMENT</text>
        <text x="135" y="510" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="135" y="524" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">PREHEATER</text>
        <text x="330" y="485" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">HEATED</text>
        <text x="330" y="500" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">SOLVENT</text>
        <text x="330" y="530" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">SLUDGE</text>
        <text x="790" y="470" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000">WATER</text>
        <text x="830" y="500" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">CONDENSATE</text>
        <text x="620" y="450" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">COOLING</text>
        <text x="620" y="464" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">WATER</text>

        {/* Instructions box */}
        <g transform="translate(640,490)">
          <rect x="0" y="0" width="175" height="24" fill="#fff" stroke="#1d4ed8" strokeWidth="1.5" rx="1" />
          <text x="88" y="9" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1d4ed8" fontStyle="italic">Left-click on valves to open,</text>
          <text x="88" y="19" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1d4ed8" fontStyle="italic">right-click to close.</text>
        </g>

        {/* Temperature chart */}
        <GLTempChart x={650} y={520} w={190} h={50} history={histVals} />

      </svg>
    </div>
  )

  return (
    <DemoViewerLayout
      canvas={canvas}
      side={{ demo, running, setRunning, reset: () => window.location.reload(), signals, alarms,
        widgets: ['3D Tanks & Pipes', 'Pressure Gauge', 'Interactive Valves', 'Temperature Chart'],
        notes: ['Faithful recreation of GenLogic Solvent Recovery System.', 'Left-click valves to open, right-click to close.', 'Uses exact GenLogic simulation feedback loop model.'] }}
    />
  )
}
