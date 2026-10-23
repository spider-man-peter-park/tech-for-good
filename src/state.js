import { lessons } from './content.js';

export const STORAGE_KEY = 'ai-starter-class.progress.v1';
const empty = () => ({ version: 1, completed: [], answers: {} });
export function normalizeProgress(value) {
  if (!value || value.version !== 1) return empty();
  const answers = {};
  for (const lesson of lessons) {
    const answer = value.answers?.[lesson.id];
    if (Number.isInteger(answer) && answer >= 0 && answer < lesson.quiz.options.length) answers[lesson.id] = answer;
  }
  const completed = [...new Set(Array.isArray(value.completed) ? value.completed : [])]
    .filter(id => lessons.some(lesson => lesson.id === id));
  return { version: 1, completed, answers };
}
export function loadProgress(storage) {
  try { return { data: normalizeProgress(JSON.parse(storage.getItem(STORAGE_KEY))), available: true }; }
  catch { return { data: empty(), available: false }; }
}
export function saveProgress(storage, data) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(data))); return true; }
  catch { return false; }
}
