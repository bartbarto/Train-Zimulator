import { Vector3 } from 'three'
import { clamp, clamp01, DEG_TO_RAD } from '@/engine/math'

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'fog'

export interface WeatherPreset {
  /** Wheel/rail adhesion multiplier (1 = dry). */
  adhesion: number
  /** Linear fog density factor 0..1. */
  fog: number
  /** Cloud cover 0..1, dimming the sun. */
  cloudCover: number
  /** Rain intensity 0..1. */
  rain: number
}

export const WEATHER_PRESETS: Record<WeatherKind, WeatherPreset> = {
  clear: { adhesion: 1.0, fog: 0.05, cloudCover: 0.1, rain: 0 },
  cloudy: { adhesion: 0.95, fog: 0.12, cloudCover: 0.7, rain: 0 },
  rain: { adhesion: 0.7, fog: 0.25, cloudCover: 0.9, rain: 0.8 },
  fog: { adhesion: 0.85, fog: 0.8, cloudCover: 0.6, rain: 0 },
}

const SECONDS_PER_DAY = 86400
const MAX_SUN_ELEVATION_DEG = 62

/**
 * Drives time-of-day and weather. Computes a sun direction and lighting
 * factors from the clock, and exposes weather-derived values (adhesion, fog,
 * rain) consumed by the renderer, sky and simulation.
 */
export class Environment {
  /** Seconds since midnight (0..86400). */
  timeOfDay = 12 * 3600
  /** Simulation time multiplier for the clock. */
  timeScale = 60
  weather: WeatherKind = 'clear'

  readonly sunDirection = new Vector3(0, 1, 0)
  sunIntensity = 1
  /** 0 at night, 1 at full day — drives ambient/exposure. */
  daylight = 1

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt * this.timeScale) % SECONDS_PER_DAY
    this.recomputeSun()
  }

  setWeather(kind: WeatherKind): void {
    this.weather = kind
  }

  setTimeOfDay(seconds: number): void {
    this.timeOfDay = ((seconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY
    this.recomputeSun()
  }

  get preset(): WeatherPreset {
    return WEATHER_PRESETS[this.weather]
  }

  private recomputeSun(): void {
    const dayFraction = this.timeOfDay / SECONDS_PER_DAY
    // Elevation peaks at solar noon (0.5) and is 0 at 06:00 / 18:00.
    const elevationDeg = MAX_SUN_ELEVATION_DEG * Math.sin((dayFraction - 0.25) * Math.PI * 2)
    const azimuthDeg = (dayFraction * 360 + 90) % 360
    const el = elevationDeg * DEG_TO_RAD
    const az = azimuthDeg * DEG_TO_RAD
    this.sunDirection.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize()

    this.daylight = clamp01(Math.sin(Math.max(0, elevationDeg) * DEG_TO_RAD) + 0.05)
    const cloudDim = 1 - this.preset.cloudCover * 0.6
    this.sunIntensity = clamp(this.daylight * cloudDim, 0, 1) * 3
  }

  /** Combined adhesion factor from weather, used by the train. */
  get adhesionFactor(): number {
    return this.preset.adhesion
  }

  restore(timeOfDay: number, weather: WeatherKind): void {
    this.timeOfDay = timeOfDay
    this.weather = weather
    this.recomputeSun()
  }
}
