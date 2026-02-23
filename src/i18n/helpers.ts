export type TranslateParams = Record<string, unknown>;

export type TranslateFn = (key: string, values?: any) => string;

export function t(translate: TranslateFn, key: string, params?: TranslateParams) {
  return translate(key, params);
}

export const tKey = t;

export function tPlural(translate: TranslateFn, key: string, count: number, params?: TranslateParams) {
  return translate(key, {count, ...(params ?? {})});
}
