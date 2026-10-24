import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons, fullPrompt, finalText } from '../src/content.js';
import { lessonsEn } from '../src/content-en.js';
import { getLocaleData, resolveLocale, saveLocale, LOCALE_KEY, uiPairs } from '../src/i18n.js';

function structure(value) {
  if (Array.isArray(value)) return value.map(structure);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, structure(item)]));
  return typeof value;
}

test('英文四课覆盖相同内容结构，稳定 ID 与答案顺序兼容已有进度', () => {
  assert.equal(lessonsEn.length, lessons.length);
  for (const [index, en] of lessonsEn.entries()) {
    const zh = lessons[index];
    assert.deepEqual(structure(en), structure(zh), en.id);
    for (const key of ['id', 'number', 'icon', 'color', 'minutes']) assert.equal(en[key], zh[key]);
    assert.equal(en.quiz.options.findIndex(option => option.correct), zh.quiz.options.findIndex(option => option.correct));
    assert.ok(en.prompt.includes('English'));
    assert.ok(fullPrompt(en).includes(en.source));
    assert.equal(/\p{Script=Han}/u.test(JSON.stringify(en)), false, `${en.id} has untranslated content`);
  }
});

test('英文成果保留原始案例的关键事实、货币及不确定性', () => {
  const output = Object.fromEntries(lessonsEn.map(lesson => [lesson.id, finalText(lesson, 'en')]));
  assert.match(output.email, /April 18, 2027/); assert.match(output.email, /20 seats/);
  assert.match(output.email, /Is the room available/);
  assert.match(output.meeting, /12 registrations against a target of 20/);
  assert.match(output.meeting, /approval is still pending/);
  assert.match(output.reading, /36 visits, not unique people/);
  assert.match(output.reading, /CNY 860 spent, CNY 340 left/);
  assert.match(output.reading, /unapproved/);
  assert.match(output.report, /48 \/ 60 visits/);
  assert.match(output.report, /15 ÷ 18 ≈ 83%/);
  assert.match(output.report, /CNY 280/);
  assert.match(output.email, /Subject: /);
});

test('界面词条成对齐全，英文文案没有中文残留，参数名一致', async () => {
  for (const [key, pair] of Object.entries(uiPairs)) {
    assert.equal(pair.length, 2, key);
    assert.deepEqual(structure(pair[0]), structure(pair[1]), key);
    assert.equal(/\p{Script=Han}/u.test(JSON.stringify(pair[1])), false, key);
    const parameters = text => [...JSON.stringify(text).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(parameters(pair[0]), parameters(pair[1]), key);
  }
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...app.matchAll(/\bu\.(\w+)/g), ...app.matchAll(/\bt\('([^']+)'/g), ...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(match => match[1]);
  for (const key of keys) assert.ok(Object.hasOwn(uiPairs, key), `Missing UI key: ${key}`);
});

test('语言优先级为显式链接、保存的偏好、中文默认；异常值安全回退', () => {
  const storage = { getItem: () => 'en' };
  assert.equal(resolveLocale(storage), 'en');
  assert.equal(resolveLocale(storage, '?lang=zh'), 'zh');
  assert.equal(resolveLocale(storage, '?lang=fr'), 'en');
  assert.equal(resolveLocale({ getItem: () => '{broken' }, '?lang=<script>'), 'zh');
  assert.equal(resolveLocale(undefined), 'zh');
  assert.equal(resolveLocale(undefined, '?lang=en'), 'en');
  assert.equal(getLocaleData('unknown').lessons, lessons);
});

test('保存语言不修改学习进度；禁用存储不会阻止 URL 选择语言', () => {
  const entries = new Map([['ai-starter-class.progress.v1', 'existing progress']]);
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  assert.equal(saveLocale(storage, 'en'), true);
  assert.equal(entries.get(LOCALE_KEY), 'en');
  assert.equal(entries.get('ai-starter-class.progress.v1'), 'existing progress');
  assert.equal(saveLocale(storage, 'fr'), false);
  assert.equal(saveLocale(undefined, 'en'), false);
  assert.equal(resolveLocale({ getItem() { throw new Error('disabled'); } }, '?lang=en'), 'en');
});
