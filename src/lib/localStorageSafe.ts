export function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readLocalJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalKey(key: string): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(key);
}
