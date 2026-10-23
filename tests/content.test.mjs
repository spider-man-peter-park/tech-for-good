import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, fullPrompt, finalText, sourceReference } from '../src/content.js';
import { normalizeProgress, loadProgress, saveProgress, STORAGE_KEY } from '../src/state.js';

test('四节课都包含可独立使用的完整教材与唯一可答练习', () => {
  assert.deepEqual(lessons.map(lesson => lesson.id), ['email', 'meeting', 'reading', 'report']);
  for (const lesson of lessons) {
    for (const key of ['scene', 'source', 'prompt', 'before', 'after', 'comparisonLesson', 'template']) assert.ok(lesson[key].length > 25, `${lesson.id}: ${key}`);
    assert.equal(lesson.diagram.length, 4);
    assert.equal(lesson.goal.length, 4);
    assert.equal(lesson.followups.length, 3);
    assert.ok(lesson.checks.length >= 3);
    assert.ok(lesson.privacy.length >= 2);
    assert.equal(lesson.quiz.options.filter(option => option.correct).length, 1);
    assert.ok(lesson.quiz.options.every(option => option.feedback.length > 15));
    assert.ok(fullPrompt(lesson).includes(lesson.source), '完整提示词必须含原始素材');
    assert.ok(finalText(lesson).length > 150, '成果可以导出为完整文本');
  }
  assert.ok(sourceReference.url.startsWith('https://nvlpubs.nist.gov/'));
});

test('成果保留教学案例的关键事实、状态和统计口径', () => {
  const output = Object.fromEntries(lessons.map(lesson => [lesson.id, finalText(lesson)]));
  assert.match(output.email, /20 个座位/); assert.match(output.email, /是否收费/);
  assert.match(output.meeting, /报名 12 人，目标 20 人/); assert.match(output.meeting, /场地审批尚未完成/);
  assert.match(output.reading, /36 人次，未去重/); assert.match(output.reading, /尚未批准/);
  assert.match(output.report, /48 \/ 60 人次/); assert.match(output.report, /15 ÷ 18 ≈ 83%/);
  assert.equal(Math.round(3 / 4 * 100), 75);
  assert.equal(Math.round(48 / 60 * 100), 80);
  assert.equal(Math.round(720 / 1000 * 100), 72);
  assert.equal(Math.round(15 / 18 * 100), 83);
  assert.equal(1000 - 720, 280);
});

test('进度去重，丢弃未知课程及无效选项，不把任意字段写入存储', () => {
  const data = normalizeProgress({ version: 1, completed: ['email', 'email', 'unknown', '<script>'], answers: { email: 1, meeting: -1, reading: 99, report: '1', unknown: 0 }, privateText: '不应保存' });
  assert.deepEqual(data, { version: 1, completed: ['email'], answers: { email: 1 } });
  assert.deepEqual(normalizeProgress({ version: 2 }), { version: 1, completed: [], answers: {} });
  assert.deepEqual(normalizeProgress(null), { version: 1, completed: [], answers: {} });
});

test('存储被禁用或数据损坏时仍提供可学习的默认状态', () => {
  const blocked = { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadProgress(blocked).available, false);
  assert.equal(saveProgress(blocked, { version: 1 }), false);
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }).data.completed, []);
  assert.deepEqual(loadProgress(undefined).data.answers, {});
});

test('正常保存及刷新恢复；复习答错不丢失已经完成的课程', () => {
  const items = new Map();
  const storage = { getItem: key => items.get(key) || null, setItem: (key, value) => items.set(key, value) };
  assert.equal(saveProgress(storage, { version: 1, completed: ['email'], answers: { email: 0 } }), true);
  assert.equal(items.has(STORAGE_KEY), true);
  assert.deepEqual(loadProgress(storage).data, { version: 1, completed: ['email'], answers: { email: 0 } });
});
