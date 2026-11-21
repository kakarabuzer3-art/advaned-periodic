/**
 * localStorage that never throws. Private browsing, blocked storage and corrupt values all
 * degrade to "nothing saved" instead of breaking the app. Values are validated by the caller.
 */
export function loadJson<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
