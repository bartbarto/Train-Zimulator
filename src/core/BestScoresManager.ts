import {
  computeSessionScore,
  isFullCompletion,
} from '@/core/SessionScore'
import type { SessionResult } from '@/simulation/SessionStats'

export interface ComboBestRecord {
  locomotiveId: string
  routeId: string
  bestScore: number
  /** Fastest full-completion time, or null if never fully completed. */
  bestTimeSeconds: number | null
  attempts: number
  updatedAt: number
}

export interface RecordUpdate {
  score: number
  isNewBestScore: boolean
  isNewBestTime: boolean
  previousBestScore: number | null
  previousBestTimeSeconds: number | null
}

interface BestScoresStore {
  version: 1
  records: Record<string, ComboBestRecord>
}

const STORAGE_KEY = 'trainsim.bestScores.v1'

function comboKey(routeId: string, locomotiveId: string): string {
  return `${routeId}:${locomotiveId}`
}

/** Persists personal bests per route / locomotive combination in localStorage. */
export class BestScoresManager {
  private store: BestScoresStore

  constructor() {
    this.store = this.load()
  }

  get(routeId: string, locomotiveId: string): ComboBestRecord | null {
    return this.store.records[comboKey(routeId, locomotiveId)] ?? null
  }

  /** Save run stats and return whether any personal bests were beaten. */
  record(locomotiveId: string, routeId: string, result: SessionResult): RecordUpdate {
    const key = comboKey(routeId, locomotiveId)
    const existing = this.store.records[key] ?? null
    const score = computeSessionScore(result)
    const fullCompletion = isFullCompletion(result)

    const previousBestScore = existing?.bestScore ?? null
    const previousBestTimeSeconds = existing?.bestTimeSeconds ?? null

    const isNewBestScore = !existing || score > existing.bestScore
    const isNewBestTime =
      fullCompletion &&
      (existing?.bestTimeSeconds == null || result.elapsedSeconds < existing.bestTimeSeconds)

    const next: ComboBestRecord = {
      locomotiveId,
      routeId,
      bestScore: isNewBestScore ? score : existing!.bestScore,
      bestTimeSeconds: isNewBestTime
        ? result.elapsedSeconds
        : existing?.bestTimeSeconds ?? null,
      attempts: (existing?.attempts ?? 0) + 1,
      updatedAt: Date.now(),
    }

    this.store.records[key] = next
    this.persist()

    return {
      score,
      isNewBestScore,
      isNewBestTime,
      previousBestScore,
      previousBestTimeSeconds,
    }
  }

  private load(): BestScoresStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { version: 1, records: {} }
      const parsed = JSON.parse(raw) as BestScoresStore
      if (parsed.version !== 1 || typeof parsed.records !== 'object') {
        return { version: 1, records: {} }
      }
      return parsed
    } catch {
      return { version: 1, records: {} }
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store))
    } catch {
      // ignore quota / privacy errors
    }
  }
}
