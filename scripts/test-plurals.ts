import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/i18n/es.json');
const es = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

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

function assertPluralKey(key: string, mustInclude: string[]) {
  const value = get(es, key);
  if (!value.includes('{count, plural')) {
    throw new Error(`Plural format missing in ${key}`);
  }

  for (const token of mustInclude) {
    if (!value.includes(token)) {
      throw new Error(`Plural token "${token}" missing in ${key}`);
    }
  }
}

assertPluralKey('agentBuilder.stepsCount', ['one {# paso}', 'other {# pasos}']);
assertPluralKey('agentBuilder.toolsCount', ['one {# herramienta}', 'other {# herramientas}']);
assertPluralKey('skillBuilder.skillsCount', ['one {# skill}', 'other {# skills}']);
assertPluralKey('common.minutesAgo', ['one {hace # min}', 'other {hace # min}']);
assertPluralKey('common.hoursAgo', ['one {hace # h}', 'other {hace # h}']);
assertPluralKey('common.daysAgo', ['one {hace # día}', 'other {hace # días}']);

console.log('OK: pluralización ES validada.');
