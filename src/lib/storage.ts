const keys = {
  locale: 'promptito.locale',
  promptDrafts: 'promptito.promptDrafts',
  promptBuilderPrefs: 'promptito.promptBuilderPrefs',
  skillPacks: 'promptito.skillPacks',
  agents: 'promptito.agents',
  user: 'promptito.user',
};

export const storageKeys = keys;

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}
