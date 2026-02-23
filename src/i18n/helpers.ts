export type TranslateParams = Record<string, unknown>;

export type TranslateFn = (key: string, values?: any) => string;

export function tKey(t: TranslateFn, key: string, params?: TranslateParams) {
  return t(key, params);
}

export function tPlural(t: TranslateFn, key: string, count: number, params?: TranslateParams) {
  return t(key, {count, ...(params ?? {})});
}
