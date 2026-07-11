import type { SessionResult } from '@/simulation/SessionStats'

/** Derive a single run score from session statistics. Higher is better. */
export function computeSessionScore(result: SessionResult): number {
  const missed = result.stationsTotal - result.stationsServed
  const completionRatio =
    result.stationsTotal > 0 ? result.stationsServed / result.stationsTotal : 1

  const base = Math.round(completionRatio * 5000)
  const passengerPts = result.passengersTransported * 8
  const timeBonus = Math.max(0, Math.round(3000 - result.elapsedSeconds * 3))
  const offencePenalty = result.offences * 600
  const missedPenalty = missed * 1500

  return Math.max(0, base + passengerPts + timeBonus - offencePenalty - missedPenalty)
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function isFullCompletion(result: SessionResult): boolean {
  return result.stationsServed >= result.stationsTotal && result.stationsTotal > 0
}
