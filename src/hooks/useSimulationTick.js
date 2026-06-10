import { useEffect, useRef, useState } from 'react'

/**
 * Lightweight tick hook for simulation loops.
 * Fully local. No network, no globals. Returns a step counter that
 * increments every `interval` ms while `running` is true.
 *
 * Cleanup is guaranteed via useEffect return.
 */
export function useSimulationTick(interval = 1000, initialRunning = true) {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(initialRunning)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!running) return undefined
    timerRef.current = window.setInterval(() => {
      setStep((s) => s + 1)
    }, interval)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [running, interval])

  const reset = () => setStep(0)

  return { step, running, setRunning, reset }
}
