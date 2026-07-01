import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, freshState } from './srs';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

test('первый успешный ответ → интервал 1 день, repetitions 1', () => {
  const r = schedule(freshState(), 5, NOW);
  assert.equal(r.repetitions, 1);
  assert.equal(r.interval_days, 1);
  assert.equal(r.due_at, NOW + DAY);
  assert.ok(r.ease_factor >= 2.5);
});

test('второй успешный ответ → интервал 6 дней', () => {
  const r = schedule({ ease_factor: 2.5, interval_days: 1, repetitions: 1 }, 4, NOW);
  assert.equal(r.repetitions, 2);
  assert.equal(r.interval_days, 6);
});

test('третий успешный ответ → интервал растёт через ease', () => {
  const r = schedule({ ease_factor: 2.5, interval_days: 6, repetitions: 2 }, 5, NOW);
  assert.equal(r.repetitions, 3);
  assert.equal(r.interval_days, Math.round(6 * r.ease_factor));
  assert.ok(r.interval_days > 6);
});

test('grade < 3 сбрасывает интервал и repetitions', () => {
  const r = schedule({ ease_factor: 2.5, interval_days: 30, repetitions: 5 }, 1, NOW);
  assert.equal(r.repetitions, 0);
  assert.equal(r.interval_days, 0);
  assert.equal(r.due_at, NOW); // due сразу
  assert.equal(r.status, 'learning');
});

test('ease не опускается ниже 1.3', () => {
  let state = freshState();
  for (let i = 0; i < 10; i++) {
    const r = schedule(state, 0, NOW);
    state = { ease_factor: r.ease_factor, interval_days: r.interval_days, repetitions: r.repetitions };
  }
  assert.ok(state.ease_factor >= 1.3);
});

test('длинный интервал помечается статусом known', () => {
  const r = schedule({ ease_factor: 2.6, interval_days: 15, repetitions: 4 }, 5, NOW);
  assert.ok(r.interval_days >= 21);
  assert.equal(r.status, 'known');
});

test('хороший ответ повышает ease, плохой понижает', () => {
  const up = schedule(freshState(), 5, NOW);
  const down = schedule(freshState(), 3, NOW);
  assert.ok(up.ease_factor > down.ease_factor);
});
