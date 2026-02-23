import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/i18n/es.json');
const es = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

function flattenStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenStrings(item, acc));
    return acc;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => flattenStrings(item, acc));
  }
  return acc;
}

function get(obj: unknown, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, obj);

  if (typeof value !== 'string') {
    throw new Error(`Missing string key: ${key}`);
  }

  return value;
}

const all = flattenStrings(es).join('\n');
const forbidden = [
  'CopiarExportar',
  'Copiar promptExportar',
  'Download Pack (.zip)',
  'Export Bundle (.zip)',
  'Prompt Structure',
  'Login / Register',
  'Public Gallery',
  'View detail',
  'Sign in to continue',
];

for (const token of forbidden) {
  if (all.includes(token)) {
    throw new Error(`Forbidden ES copy found: ${token}`);
  }
}

const requiredPairs: Array<[string, string]> = [
  ['nav.home', 'Inicio'],
  ['gallery.title', 'Galería'],
  ['promptBuilder.antiHallucination', 'Verificación de consistencia'],
  ['skillBuilder.downloadPack', 'Descargar pack (.zip)'],
  ['agentBuilder.exportBundle', 'Exportar bundle (.zip)'],
  ['auth.requiredTitle', 'Inicia sesión para continuar'],
  ['auth.requiredDesc', 'Necesitas una cuenta para publicar o guardar en favoritos.'],
  ['common.genericError', 'Ocurrió un error. Intenta de nuevo.'],
  ['promptBuilder.antiHallucinationTooltip', 'Añade reglas para reducir errores e inventos.'],
  ['gallery.empty', 'Publica el primero y ayúdanos a iniciar la biblioteca.'],
  ['actions.copy', 'Copiar'],
  ['actions.export', 'Exportar'],
  ['actions.saveDraft', 'Guardar borrador'],
];

for (const [key, expected] of requiredPairs) {
  const value = get(es, key);
  if (value !== expected) {
    throw new Error(`Unexpected value for ${key}. Expected: "${expected}". Received: "${value}"`);
  }
}

console.log('OK: copy ES consistente y sin cadenas EN conocidas.');
