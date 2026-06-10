import { useState, useEffect, useRef, useCallback } from 'react'

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

/**
 * Faithful port of GlgProcess.GetSimulatedData() simulation model.
 * All variable names match the original GenLogic source.
 */
export function useProcessSimulation(intervalMs = 50) {
  const stateRef = useRef({
    counter: 0,
    SolventValve: 0.85, SteamValve: 1.0, CoolingValve: 0.8, WaterValve: 0.4,
    SolventFlow: 0, SteamFlow: 0, CoolingFlow: 0, WaterFlow: 0,
    OutFlow: 3495.0,
    SteamTemperature: 0, HeaterTemperature: 0,
    BeforePreHeaterTemperature: 0, PreHeaterTemperature: 0,
    AfterPreHeaterTemperature: 0, CoolingTemperature: 0,
    HeaterPressure: 0, HeaterLevel: 0.5, WaterLevel: 0.1,
    HeaterAlarm: false, WaterAlarm: false,
    heater_high: 0, heater_low: 0, water_high: 0, water_low: 0,
    steam_high: 0, steam_low: 0, cooling_high: 0, cooling_low: 0,
  })

  const [running, setRunning] = useState(true)
  const [snapshot, setSnapshot] = useState({
    counter: 0,
    SolventValve: 0.85, SteamValve: 1.0, CoolingValve: 0.8, WaterValve: 0.4,
    SolventFlow: 0, SteamFlow: 0, CoolingFlow: 0, WaterFlow: 0,
    OutFlow: 3495.0,
    SteamTemperature: 0, HeaterTemperature: 0,
    BeforePreHeaterTemperature: 0, PreHeaterTemperature: 0,
    AfterPreHeaterTemperature: 0, CoolingTemperature: 0,
    HeaterPressure: 0, HeaterLevel: 0.5, WaterLevel: 0.1,
    HeaterAlarm: false, WaterAlarm: false,
    heater_high: 0, heater_low: 0, water_high: 0, water_low: 0,
    steam_high: 0, steam_low: 0, cooling_high: 0, cooling_low: 0,
  })

  const lagVar = (v, lag) => v !== 0 ? v - 1 : lag

  const tick = useCallback(() => {
    const s = stateRef.current
    const SP = 0.05, HLS = 0.05, WLS = 0.02, VCS = 0.05, SVCS = 0.05

    s.counter++

    s.SteamTemperature += (s.SteamValve - 0.6) * 2 * SP
    s.SteamTemperature = clamp(s.SteamTemperature, 0, 1)

    s.HeaterTemperature += (s.SteamTemperature - s.HeaterTemperature * s.HeaterLevel) * SP
    s.HeaterTemperature = clamp(s.HeaterTemperature, 0, 1.5)

    s.BeforePreHeaterTemperature += (1.5 * s.HeaterTemperature - s.BeforePreHeaterTemperature) * SP
    s.BeforePreHeaterTemperature = clamp(s.BeforePreHeaterTemperature, 0, 1)

    s.PreHeaterTemperature += (s.BeforePreHeaterTemperature - s.PreHeaterTemperature) * SP
    s.PreHeaterTemperature = clamp(s.PreHeaterTemperature, 0, 1)

    s.AfterPreHeaterTemperature += (0.9 * s.HeaterTemperature - s.AfterPreHeaterTemperature) * SP
    s.AfterPreHeaterTemperature = clamp(s.AfterPreHeaterTemperature, 0, 1)

    s.CoolingTemperature += (s.AfterPreHeaterTemperature - s.CoolingTemperature - s.CoolingValve) * SP
    s.CoolingTemperature = clamp(s.CoolingTemperature, 0, 1)

    s.OutFlow = s.SolventValve * 3495.0

    s.HeaterLevel += (s.SolventValve - 0.75) * HLS
    s.HeaterLevel = clamp(s.HeaterLevel, 0, 1)

    s.WaterLevel += (0.5 - s.WaterValve) * WLS
    s.WaterLevel = clamp(s.WaterLevel, 0, 1)

    if (s.HeaterLevel > 0.9 || s.heater_high !== 0) {
      s.heater_high = lagVar(s.heater_high, 10)
      s.SolventValve -= VCS
    } else if (s.HeaterLevel < 0.45 || s.heater_low !== 0) {
      s.heater_low = lagVar(s.heater_low, 10)
      s.SolventValve += VCS
    }
    s.SolventValve = clamp(s.SolventValve, 0, 1)

    if (s.WaterLevel > 0.2 || s.water_high !== 0) {
      s.water_high = lagVar(s.water_high, 10)
      s.WaterValve += VCS
    } else if (s.WaterLevel < 0.05 || s.water_low !== 0) {
      s.water_low = lagVar(s.water_low, 10)
      s.WaterValve -= VCS
    }
    s.WaterValve = clamp(s.WaterValve, 0, 1)

    if (s.SteamTemperature > 0.9 || s.steam_high !== 0) {
      s.steam_high = lagVar(s.steam_high, 20)
      s.SteamValve -= SVCS
    } else if (s.SteamTemperature < 0.2 || s.steam_low !== 0) {
      s.steam_low = lagVar(s.steam_low, 20)
      s.SteamValve += SVCS
    }
    s.SteamValve = clamp(s.SteamValve, 0, 1)

    if (s.CoolingTemperature > 0.7 || s.cooling_high !== 0) {
      s.cooling_high = lagVar(s.cooling_high, 10)
      s.CoolingValve += VCS
    } else if (s.CoolingTemperature < 0.3 || s.cooling_low !== 0) {
      s.cooling_low = lagVar(s.cooling_low, 10)
      s.CoolingValve -= VCS
    }
    s.CoolingValve = clamp(s.CoolingValve, 0, 1)

    s.HeaterPressure = s.HeaterLevel * (s.HeaterTemperature + 1) / 2
    s.HeaterPressure = clamp(s.HeaterPressure, 0, 1)

    s.HeaterAlarm = s.HeaterLevel < 0.45 || s.HeaterLevel > 0.9
    s.WaterAlarm = s.WaterLevel > 0.2 || s.WaterLevel < 0.05

    setSnapshot({ ...s })
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [running, intervalMs, tick])

  const adjustValve = useCallback((name, delta) => {
    const s = stateRef.current
    s[name] = clamp(s[name] + delta, 0, 1)
  }, [])

  return { data: snapshot, running, setRunning, adjustValve }
}
