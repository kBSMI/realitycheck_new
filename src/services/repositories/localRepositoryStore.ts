import { readLocalJson, writeLocalJson } from '../../lib/localStorageSafe';

export function localList<T>(key: string): T[] {
  return readLocalJson<T[]>(key, []);
}

export function localSaveList<T>(key: string, values: T[]): void {
  writeLocalJson(key, values);
}

export function localUpsert<T extends { id: string }>(key: string, value: T): T {
  const existing = localList<T>(key);
  const next = [value, ...existing.filter((item) => item.id !== value.id)];
  localSaveList(key, next);
  return value;
}

export function localDelete(key: string, id: string): void {
  localSaveList(key, localList<{ id: string }>(key).filter((item) => item.id !== id));
}
