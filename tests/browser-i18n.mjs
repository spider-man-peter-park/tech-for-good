import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fullPrompt } from '../src/content.js';
import { getLocaleData, LOCALE_KEY } from '../src/i18n.js';
import { STORAGE_KEY } from '../src/state.js';

const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE || require.resolve('playwright');
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), args: ['--no-sandbox'] });
const base = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const output = new URL(process.env.TEST_ARTIFACTS || '../artifacts/i18n/', import.meta.url);
await mkdir(output, { recursive: true });
const results = [], errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const chinese = getLocaleData('zh'), english = getLocaleData('en');
async function check(name, run) { await run(); results.push({ name, result: 'PASS' }); console.log(`✓ ${name}`); }
const language = () => page.locator('html').getAttribute('lang');
async function switchTo(locale) { await page.locator(`[data-locale="${locale}"]`).click(); assert.equal(await language(), locale === 'en' ? 'en' : 'zh-CN'); }
try {
  await check('页面、标题、语言属性和图解一起切换，反复点击不重复渲染', async () => {
    await page.goto(base);
    await switchTo('en');
    await page.locator('[data-locale="en"]').click();
    await page.locator('[data-locale="en"]').click();
    assert.equal(await page.locator('.hero').count(), 1);
    assert.equal(await page.locator('[data-locale="en"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-locale="en"]').evaluate(el => el === document.activeElement), true);
    assert.match(await page.title(), /AI Starter Class/);
    assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /Four illustrated AI lessons/);
    assert.match(await page.locator('.hero-visual img').getAttribute('src'), /hero-en.svg$/);
    assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LOCALE_KEY), 'en');
    await page.reload(); assert.equal(await language(), 'en');
  });
  await check('英文覆盖全部页面、正文与无障碍标签，没有中文界面残留', async () => {
    for (const route of ['#/', '#/lesson/email', '#/lesson/meeting', '#/lesson/reading', '#/lesson/report', '#/toolkit', '#/guide', '#/missing']) {
      await page.goto(`${base}?lang=en${route}`);
      await page.locator('h1').waitFor();
      const visible = await page.locator('main').innerText();
      assert.equal(/\p{Script=Han}/u.test(visible), false, route);
      assert.equal(/undefined|\[object Object\]/.test(visible), false, route);
      const labels = await page.locator('[aria-label]').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')).join('\n'));
      assert.equal(/\p{Script=Han}/u.test(labels), false, route);
    }
  });
  await check('切换保留课程、步骤、练习答案、旧版进度、展开素材与对比视图', async () => {
    await page.goto(`${base}?lang=zh#/lesson/meeting?section=compare`);
    await page.locator('input[value="1"]').check(); await page.locator('[data-complete]').click();
    const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
    await page.locator('.prompt-source summary').click();
    await page.locator('[data-compare="after"]').click();
    const hash = new URL(page.url()).hash;
    await switchTo('en');
    assert.equal(new URL(page.url()).hash, hash);
    assert.equal(await page.locator('h1').textContent(), english.lessons[1].title);
    assert.equal(await page.locator('.comparison').getAttribute('data-view'), 'after');
    assert.equal(await page.locator('.prompt-source').evaluate(el => el.open), true);
    assert.equal(await page.locator('input[value="1"]').isChecked(), true);
    assert.equal(await page.locator('[data-complete]').textContent(), english.ui.completeDone);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), before);
    await page.locator('.prompt-toolbar [data-copy]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fullPrompt(english.lessons[1]));
    await switchTo('zh');
    await page.locator('.prompt-toolbar [data-copy]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fullPrompt(chinese.lessons[1]));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), before);
    await page.reload(); assert.equal(await page.locator('[data-complete]').textContent(), chinese.ui.completeDone);
  });
  await check('任务卡切换语言保留用户文字，复制与模板下载跟随当前语言', async () => {
    await page.goto(`${base}?lang=zh#/toolkit`);
    const values = ['My fictional event <img src=x onerror=alert(1)>', 'Write an invitation', 'Title and two paragraphs', 'Do not invent a date'];
    for (const [i, field] of (await page.locator('[data-builder]').all()).entries()) await field.fill(values[i]);
    await switchTo('en');
    assert.deepEqual(await page.locator('[data-builder]').evaluateAll(fields => fields.map(field => field.value)), values);
    assert.equal(await page.locator('#builder-output img').count(), 0);
    await page.locator('[data-copy-builder]').click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Write the response in English/);
    for (const locale of ['en', 'zh']) {
      await switchTo(locale);
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-download]').click()]);
      assert.equal(download.suggestedFilename(), getLocaleData(locale).ui.downloadName);
      const path = new URL(`templates-${locale}.txt`, output).pathname;
      await download.saveAs(path);
      const text = await readFile(path, 'utf8');
      for (const lesson of getLocaleData(locale).lessons) assert.ok(text.includes(lesson.template));
      if (locale === 'en') assert.equal(/\p{Script=Han}/u.test(text), false);
    }
    const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
    assert.equal(JSON.stringify(stored).includes('My fictional event'), false);
  });
  await check('保存偏好、显式语言链接与异常语言参数按优先级处理', async () => {
    await switchTo('en');
    await page.goto(base); assert.equal(await language(), 'en');
    await page.goto(`${base}?lang=zh#/lesson/email`); assert.equal(await language(), 'zh-CN');
    await page.goto(`${base}?lang=unknown#/lesson/email`); assert.equal(await language(), 'en');
    await page.goto(`${base}?lang=%3Cimg%20src=x%3E#/lesson/email`); assert.equal(await language(), 'en');
    assert.equal(await page.locator('img[src="x"]').count(), 0);
  });
  await check('浏览器前进后退遵循历史链接的语言，不覆盖最后主动选择的偏好', async () => {
    await page.goto(`${base}?lang=zh#/`);
    await page.locator('.course-card').first().click();
    await switchTo('en');
    await page.goBack();
    await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
    assert.equal(await page.locator('.course-card').count(), 4);
    assert.equal(new URL(page.url()).searchParams.get('lang'), 'zh');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LOCALE_KEY), 'en');
    await page.goForward();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await page.locator('h1').textContent(), english.lessons[0].title);
  });
  await check('英文清除进度保留语言，禁用存储仍支持切换与英文手动复制', async () => {
    await page.goto(`${base}?lang=en#/guide`);
    await page.locator('[data-reset]').click();
    assert.equal(await page.locator('dialog h2').textContent(), english.ui.resetTitle);
    await page.locator('[data-confirm-reset]').click(); await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LOCALE_KEY), 'en');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).completed, STORAGE_KEY), []);
    const isolated = await browser.newContext();
    await isolated.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
      document.execCommand = () => false;
    });
    const limited = await isolated.newPage(); limited.on('pageerror', error => errors.push(error.message));
    await limited.goto(`${base}#/lesson/email`);
    await limited.locator('[data-locale="en"]').click(); await limited.reload();
    assert.equal(await limited.locator('html').getAttribute('lang'), 'en');
    assert.equal(await limited.locator('.storage-warning').isVisible(), true);
    await limited.locator('.prompt-toolbar [data-copy]').click();
    assert.equal(await limited.locator('dialog h2').textContent(), english.ui.manualCopyTitle);
    assert.equal(await limited.locator('dialog textarea').inputValue(), fullPrompt(english.lessons[0]));
    await isolated.close();
  });
  assert.deepEqual(errors, []);
  await writeFile(new URL('browser-i18n-results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), browser: await browser.version(), base, results, errors }, null, 2));
  console.log(`\n${results.length} 组语言切换检查通过。`);
} finally { await browser.close(); }
