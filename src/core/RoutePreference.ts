const STORAGE_KEY = 'trainsim.route.v1'

export function loadPreferredRoute(fallback: string): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? fallback
  } catch {
    return fallback
  }
}

export function savePreferredRoute(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore quota / privacy errors
  }
}
