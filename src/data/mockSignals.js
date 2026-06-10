/**
 * Reusable mock-signal helpers. 100% local math, no IO.
 * `step` is the simulator's monotonically increasing tick counter.
 */

const TAU = Math.PI * 2

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

export function wave(step, { period = 40, amp = 1, offset = 0, phase = 0 } = {}) {
  const t = (step / period) * TAU + phase
  return Math.sin(t) * amp + offset
}

export function noisySignal(step, base, swing, seed = 0) {
  const a = Math.sin((step + seed) * 0.13) * swing * 0.5
  const b = Math.sin((step + seed) * 0.41) * swing * 0.2
  const c = Math.cos((step + seed) * 0.07) * swing * 0.3
  return base + a + b + c
}

export function stateFromThresholds(value, { warningHi, alarmHi, warningLo, alarmLo } = {}) {
  if (alarmHi != null && value >= alarmHi) return 'alarm'
  if (alarmLo != null && value <= alarmLo) return 'alarm'
  if (warningHi != null && value >= warningHi) return 'warning'
  if (warningLo != null && value <= warningLo) return 'warning'
  return 'normal'
}

export const SEVERITY_COLORS = {
  normal: { fg: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', stroke: '#10b981', glow: 'rgba(16,185,129,0.45)' },
  warning: { fg: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', stroke: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  alarm: { fg: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', stroke: '#ef4444', glow: 'rgba(239,68,68,0.55)' },
  info: { fg: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', stroke: '#0ea5e9', glow: 'rgba(14,165,233,0.45)' },
  offline: { fg: 'text-slate-500', bg: 'bg-slate-500/10', stroke: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
}

/**
 * Generic Industrial signal generator (used by several demos).
 */
export function makeIndustrialSnapshot(step) {
  const temperature = clamp(noisySignal(step, 78, 28, 7), 30, 120)
  const pressure = clamp(noisySignal(step, 5.4, 2.4, 11), 1.2, 9.5)
  const flow = clamp(noisySignal(step, 1180, 560, 3), 360, 1800)
  const tank = clamp(noisySignal(step, 64, 28, 19), 10, 96)
  const pump = clamp(noisySignal(step, 60, 26, 5), 0, 100)
  const valve = clamp(noisySignal(step, 52, 34, 27), 0, 100)

  return {
    temperature, pressure, flow, tank, pump, valve,
    states: {
      temperature: stateFromThresholds(temperature, { warningHi: 88, alarmHi: 98 }),
      pressure: stateFromThresholds(pressure, { warningHi: 7, alarmHi: 8.4 }),
      flow: stateFromThresholds(flow, { warningLo: 820, alarmLo: 620 }),
      tank: stateFromThresholds(tank, { warningLo: 32, alarmLo: 20 }),
      pump: stateFromThresholds(pump, { warningHi: 80, alarmHi: 92 }),
      valve: stateFromThresholds(valve, { warningHi: 88 }),
    },
  }
}
