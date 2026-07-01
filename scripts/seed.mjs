import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const db = new DatabaseSync(resolve(process.env.DATABASE_PATH ?? './data/app.db'));

const words = [
  ['das', 'Brot', 'хлеб', 'noun', 'Ich esse Brot.'],
  ['der', 'Apfel', 'яблоко', 'noun', 'Der Apfel ist rot.'],
  ['die', 'Milch', 'молоко', 'noun', 'Die Milch ist kalt.'],
  ['das', 'Wasser', 'вода', 'noun', 'Ich trinke Wasser.'],
  ['der', 'Käse', 'сыр', 'noun', 'Der Käse ist lecker.'],
  ['die', 'Suppe', 'суп', 'noun', 'Die Suppe ist heiß.'],
];

const stmt = db.prepare(
  `INSERT INTO words (language, level, lemma, article, translation, part_of_speech, example, topic, created_at)
   VALUES ('de','A1',?,?,?,?,?, 'Essen', ?)
   ON CONFLICT(language, level, lemma) DO NOTHING`,
);
const now = Date.now();
for (const [article, lemma, translation, pos, example] of words) {
  stmt.run(lemma, article, translation, pos, example, now);
}
const c = db.prepare("SELECT COUNT(*) c FROM words WHERE topic='Essen'").get();
console.log('seeded, total Essen words:', c.c);
