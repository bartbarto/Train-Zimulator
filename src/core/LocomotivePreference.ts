export interface LocomotiveOption {
  id: string
  name: string
  type: string
}

const STORAGE_KEY = 'trainsim.locomotive.v1'

export function loadPreferredLocomotive(fallback: string): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? fallback
  } catch {
    return fallback
  }
}

export function savePreferredLocomotive(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore quota / privacy errors
  }
}
