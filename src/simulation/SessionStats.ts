import { MS_TO_KMH } from '@/engine/constants'
import { t } from '@/i18n'

export type OffenceKind = 'overspeed' | 'stationOvershoot'

export interface OffenceRecord {
  kind: OffenceKind
  label: string
  elapsedSeconds: number
}

export interface SessionResult {
  routeName: string
  elapsedSeconds: number
  offences: number
  offenceDetails: OffenceRecord[]
  passengersTransported: number
  stationsServed: number
  stationsTotal: number
  distanceMetres: number
  routeLengthMetres: number
}

export interface SessionStatsContext {
  speedMs: number
  speedLimitKmh: number
  stationOvershot: boolean
  stationId: string | null
  stationName: string | null
}

const OVERSPEED_TOLERANCE_KMH = 3
const OVERSPEED_OFFENCE_SECONDS = 1.5

/** Accumulates per-session performance metrics and detects route completion. */
export class SessionStats {
  private elapsedSeconds = 0
  private readonly offenceDetails: OffenceRecord[] = []
  private overspeedTimer = 0
  private overspeedOffenceRecorded = false
  private readonly overshotStations = new Set<string>()
  private complete = false

  update(dt: number, ctx: SessionStatsContext): void {
    if (this.complete) return

    this.elapsedSeconds += dt
    this.trackOverspeed(dt, ctx)
    this.trackStationOvershoot(ctx)
  }

  /** True once the train has passed the end of the track. */
  checkComplete(distance: number, trackLength: number): boolean {
    if (this.complete) return true
    if (distance >= trackLength) {
      this.complete = true
      return true
    }
    return false
  }

  isComplete(): boolean {
    return this.complete
  }

  getResult(
    routeName: string,
    passengersTransported: number,
    stationsServed: number,
    stationsTotal: number,
    distanceMetres: number,
    routeLengthMetres: number,
  ): SessionResult {
    return {
      routeName,
      elapsedSeconds: this.elapsedSeconds,
      offences: this.offenceDetails.length,
      offenceDetails: [...this.offenceDetails],
      passengersTransported,
      stationsServed,
      stationsTotal,
      distanceMetres,
      routeLengthMetres,
    }
  }

  private recordOffence(kind: OffenceKind, label: string): void {
    this.offenceDetails.push({ kind, label, elapsedSeconds: this.elapsedSeconds })
  }

  private trackOverspeed(dt: number, ctx: SessionStatsContext): void {
    const speedKmh = Math.abs(ctx.speedMs) * MS_TO_KMH
    const overspeeding = speedKmh > ctx.speedLimitKmh + OVERSPEED_TOLERANCE_KMH

    if (overspeeding) {
      this.overspeedTimer += dt
      if (!this.overspeedOffenceRecorded && this.overspeedTimer >= OVERSPEED_OFFENCE_SECONDS) {
        this.overspeedOffenceRecorded = true
        const speedKmh = Math.round(Math.abs(ctx.speedMs) * MS_TO_KMH)
        this.recordOffence(
          'overspeed',
          t('offence.overspeed', {
            limit: Math.round(ctx.speedLimitKmh),
            speed: speedKmh,
          }),
        )
      }
    } else {
      this.overspeedTimer = 0
      this.overspeedOffenceRecorded = false
    }
  }

  private trackStationOvershoot(ctx: SessionStatsContext): void {
    if (!ctx.stationId || !ctx.stationOvershot) return
    if (this.overshotStations.has(ctx.stationId)) return
    this.overshotStations.add(ctx.stationId)
    const name = ctx.stationName ?? t('offence.station')
    this.recordOffence('stationOvershoot', t('offence.stationOvershoot', { name }))
  }
}
