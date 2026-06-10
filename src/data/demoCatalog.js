/**
 * Catalog of 10 visual demos. Each item points to a React component
 * via `viewKey` resolved by the demo registry. Pure metadata, no imports.
 */
export const CATEGORIES = ['Manufacturing', 'Water Treatment', 'Power Utility', 'Oil & Gas', 'HVAC & Building', 'Data Center', 'GIS & Assets']
export const STYLE_TAGS = ['3D Industrial', '2D Engineering', 'Executive']

export const DEMO_CATALOG = [
  {
    id: 'mfg-mixing',
    viewKey: 'MfgMixing',
    marketSegment: 'Manufacturing',
    title: 'Flow Meter & Mixing Line',
    subtitle: 'Chemical / F&B batch mixing',
    category: 'Manufacturing',
    style: '3D Industrial',
    tags: ['Tanks', 'Inline Flow', 'Mixing', 'Pumps'],
    description: 'A realistic 3D-ish liquid mixing plant with inline flow meters, storage tanks, and pump manifolds.',
    accent: 'sky',
    palette: { from: 'from-sky-400', to: 'to-cyan-600', text: 'text-sky-700 dark:text-sky-300' },
    canvasBreakdown: { layers: ['3D Pipe grid', 'Gradient Tanks', 'Flow Meters'], bindings: ['Tank A/B Level', 'Flow Rate Q1', 'Mixer RPM'], groups: ['Inlet', 'Process', 'Delivery'], interaction: 'Hover elements, switch 3D/2D.' }
  },
  {
    id: 'water-distribution',
    viewKey: 'WaterDistribution',
    marketSegment: 'Water Treatment',
    title: 'Water Distribution & Reservoir',
    subtitle: 'PAM network monitoring',
    category: 'Water Treatment',
    style: '3D Industrial',
    tags: ['Reservoir', 'Pumps', 'Grid', 'Quality'],
    description: 'Municipal water distribution with 3D clarifiers, main reservoir tanks, and high-pressure pumping manifolds.',
    accent: 'blue',
    palette: { from: 'from-blue-500', to: 'to-indigo-500', text: 'text-blue-700 dark:text-blue-300' },
    canvasBreakdown: { layers: ['Underground pipes', 'Reservoir 3D', 'Pump house'], bindings: ['Clearwell level', 'Outflow pressure', 'Turbidity'], groups: ['Source', 'Treatment', 'City grid'], interaction: 'Toggle 3D/2D view.' }
  },
  {
    id: 'power-substation',
    viewKey: 'PowerSubstation',
    marketSegment: 'Power Utility',
    title: 'Substation Overview',
    subtitle: 'High voltage grid node',
    category: 'Power Utility',
    style: '3D Industrial',
    tags: ['Transformers', 'Breakers', 'Busbars'],
    description: 'Utility substation showing 3D step-down transformers, switchgear, and live voltage/current readings.',
    accent: 'amber',
    palette: { from: 'from-amber-400', to: 'to-orange-500', text: 'text-amber-700 dark:text-amber-300' },
    canvasBreakdown: { layers: ['HV Lines', '3D Transformers', 'Switchgear'], bindings: ['HV Voltage', 'LV Current', 'Transformer Temp'], groups: ['Incoming HV', 'Step-down', 'Distribution LV'], interaction: 'Click breaker to trip.' }
  },
  {
    id: 'power-feeder',
    viewKey: 'PowerFeeder',
    marketSegment: 'Power Utility',
    title: 'Feeder & Load Monitoring',
    subtitle: 'Distribution panels',
    category: 'Power Utility',
    style: '3D Industrial',
    tags: ['Panels', 'Meters', 'Load'],
    description: 'Detailed LV distribution panels in 3D isometric view with digital meter overlays and load alarms.',
    accent: 'yellow',
    palette: { from: 'from-yellow-400', to: 'to-amber-500', text: 'text-yellow-700 dark:text-yellow-300' },
    canvasBreakdown: { layers: ['3D Panel rows', 'Digital readouts', 'Cabling'], bindings: ['Feeder 1..4 kW', 'Power Factor', 'Panel Status'], groups: ['Main Incommer', 'Feeder Banks'], interaction: 'Toggle load simulator.' }
  },
  {
    id: 'oil-gas-tankfarm',
    viewKey: 'OilGasTankFarm',
    marketSegment: 'Oil & Gas',
    title: 'Tank Farm & Pipeline',
    subtitle: 'Terminal storage facility',
    category: 'Oil & Gas',
    style: '3D Industrial',
    tags: ['Storage', 'Valves', 'Manifold'],
    description: 'A realistic tank farm terminal with large 3D storage vessels, complex valve manifolds, and transfer pipelines.',
    accent: 'orange',
    palette: { from: 'from-orange-500', to: 'to-red-600', text: 'text-orange-700 dark:text-orange-300' },
    canvasBreakdown: { layers: ['Oil pipes', '3D Tanks', 'Valve clusters'], bindings: ['TK-101..104 Level', 'Manifold Pressure'], groups: ['Tank Block A', 'Transfer Pump', 'Export'], interaction: 'Switch 3D/2D.' }
  },
  {
    id: 'hvac-chiller',
    viewKey: 'HVACChiller',
    marketSegment: 'HVAC & Building',
    title: 'Chiller & AHU System',
    subtitle: 'Building automation plant',
    category: 'HVAC & Building',
    style: '3D Industrial',
    tags: ['Chiller', 'Cooling Tower', 'AHU'],
    description: 'BMS interface showing a central 3D water-cooled chiller, cooling tower, and AHU air flow distribution.',
    accent: 'teal',
    palette: { from: 'from-teal-400', to: 'to-emerald-500', text: 'text-teal-700 dark:text-teal-300' },
    canvasBreakdown: { layers: ['Chilled water lines', 'Condenser lines', '3D Equipment'], bindings: ['CHW Temp', 'CW Return Temp', 'Fan RPM'], groups: ['Chiller Plant', 'Cooling Tower', 'Air Handling'], interaction: 'Toggle view modes.' }
  },
  {
    id: 'mfg-packaging',
    viewKey: 'MfgPackaging',
    marketSegment: 'Manufacturing',
    title: 'Packaging Line',
    subtitle: 'High-speed discrete line',
    category: 'Manufacturing',
    style: '3D Industrial',
    tags: ['Conveyors', 'Machines', 'Counters'],
    description: 'Discrete manufacturing view featuring 3D conveyors, filling machines, and end-of-line packaging counters.',
    accent: 'violet',
    palette: { from: 'from-violet-500', to: 'to-purple-600', text: 'text-violet-700 dark:text-violet-300' },
    canvasBreakdown: { layers: ['3D Conveyor path', 'Machine blocks', 'Counters'], bindings: ['Line Speed', 'Reject Count', 'Machine State'], groups: ['Filler', 'Capper', 'Cartoner'], interaction: 'Watch animated conveyor.' }
  },
  {
    id: 'data-center-rack',
    viewKey: 'DataCenterRack',
    marketSegment: 'Data Center',
    title: 'Rack & Cooling Floor',
    subtitle: 'IT infrastructure facility',
    category: 'Data Center',
    style: '3D Industrial',
    tags: ['Racks', 'CRAC', 'Heatmap'],
    description: 'Isometric 3D view of server racks, CRAC cooling units, and raised floor with thermal gradient overlay.',
    accent: 'indigo',
    palette: { from: 'from-indigo-400', to: 'to-blue-600', text: 'text-indigo-700 dark:text-indigo-300' },
    canvasBreakdown: { layers: ['Raised floor 3D', 'Rack rows', 'CRAC models'], bindings: ['Rack Power (kW)', 'Aisle Temp'], groups: ['Cold Aisle', 'Hot Aisle', 'Cooling'], interaction: 'Hover to see rack load.' }
  },
  {
    id: 'gis-site-network',
    viewKey: 'GISNetwork',
    marketSegment: 'GIS & Assets',
    title: 'Site Asset Network',
    subtitle: 'Regional deployment map',
    category: 'GIS & Assets',
    style: '3D Industrial',
    tags: ['Map', 'Towers', 'Nodes'],
    description: 'A 3D-ish isometric regional map showing communication towers, pumping stations, or distributed assets.',
    accent: 'emerald',
    palette: { from: 'from-emerald-400', to: 'to-green-600', text: 'text-emerald-700 dark:text-emerald-300' },
    canvasBreakdown: { layers: ['Iso terrain', '3D asset markers', 'Link paths'], bindings: ['Site Status', 'Link Latency'], groups: ['Region North', 'Region South'], interaction: 'Switch to flat 2D network.' }
  },
  {
    id: 'exec-industrial',
    viewKey: 'ExecIndustrial',
    marketSegment: 'Manufacturing',
    title: 'Executive Industrial Board',
    subtitle: 'Multi-site 3D KPIs',
    category: 'Manufacturing',
    style: 'Executive',
    tags: ['KPI', 'Polished', 'High-level'],
    description: 'A polished, modern management dashboard combining 3D site miniatures with high-level production & energy KPIs.',
    accent: 'slate',
    palette: { from: 'from-slate-600', to: 'to-slate-800', text: 'text-slate-700 dark:text-slate-200' },
    canvasBreakdown: { layers: ['KPI Cards', '3D Site Models', 'Trend charts'], bindings: ['Total Output', 'Site Availability'], groups: ['Metrics', 'Sites'], interaction: 'Watch live KPI accumulation.' }
  },
]
