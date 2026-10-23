// 不启动服务、不安装浏览器。先 npm run build && npm start，再运行此脚本。
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { lessons, fullPrompt } from '../src/content.js';
import { STORAGE_KEY } from '../src/state.js';

const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) {
  try { modulePath = require.resolve('playwright'); }
  catch { throw new Error('请安装可选测试依赖 playwright，或用 PLAYWRIGHT_MODULE 指向现有模块。详见 README。'); }
}
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), args: ['--no-sandbox'] });
const base = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const output = new URL(process.env.TEST_ARTIFACTS || '../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const errors = [], externalRequests = [], results = [];
async function check(name, run) {
  await run(); results.push({ name, result: 'PASS' }); console.log(`✓ ${name}`);
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `横向溢出: ${page.url()}`);
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
try {
  await check('桌面首页、四节课程与键盘入口', async () => {
    const response = await page.goto(base); assert.equal(response.status(), 200);
    await page.locator('.course-card').first().waitFor();
    assert.equal(await page.locator('.course-card').count(), 4);
    await noOverflow(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#main').evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('.course-card').count(), 4);
    await page.keyboard.press('Tab');
    assert.ok((await page.locator(':focus').getAttribute('href'))?.startsWith('#/'));
    await page.screenshot({ path: new URL('home-desktop.png', output).pathname, fullPage: true });
  });
  await check('四课深链接、步骤导航、完整内容与对比切换', async () => {
    for (const lesson of lessons) {
      await page.goto(`${base}#/lesson/${lesson.id}`);
      await page.locator('.lesson-article').waitFor();
      assert.equal(await page.locator('.lesson-section').count(), 8);
      assert.equal(await page.locator('h1').textContent(), lesson.title);
      await noOverflow(page);
      await page.locator('[data-compare="before"]').click();
      assert.equal(await page.locator('.compare-card.after').isVisible(), false);
      await page.locator('[data-compare="before"]').click();
      await page.locator('[data-compare="after"]').click();
      assert.equal(await page.locator('.compare-card.before').isVisible(), false);
      await page.locator('[data-compare="both"]').click();
      assert.equal(await page.locator('.compare-card.before').isVisible(), true);
      await page.locator(`.toc a[href$="section=prompt"]`).click();
      await page.waitForFunction(() => { const y = document.querySelector('#prompt').getBoundingClientRect().top; return y > 85 && y < 180; });
      await page.reload();
      await page.locator('#prompt').waitFor();
      await page.waitForFunction(() => { const y = document.querySelector('#prompt').getBoundingClientRect().top; return y > 85 && y < 180; });
    }
  });
  await check('复制完整素材、追问、模板与连续点击反馈', async () => {
    await page.goto(`${base}#/lesson/email`);
    const button = page.locator('.prompt-toolbar [data-copy]');
    await button.click(); await button.click(); await button.click();
    assert.match(await button.textContent(), /已复制/);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fullPrompt(lessons[0]));
    await page.locator('.followup-card [data-copy]').first().click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), lessons[0].followups[0].text);
    await page.locator('.document-toolbar [data-copy]').click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /20 个座位/);
  });
  await check('练习错误反馈、完成门槛、重复点击与刷新进度', async () => {
    for (const lesson of lessons) {
      await page.goto(`${base}#/lesson/${lesson.id}`);
      const correct = lesson.quiz.options.findIndex(option => option.correct);
      const wrong = correct === 0 ? 1 : 0;
      assert.equal(await page.locator('[data-complete]').isDisabled(), true);
      await page.locator(`input[value="${wrong}"]`).check();
      assert.equal(await page.locator('[data-complete]').isDisabled(), true);
      assert.ok((await page.locator('.quiz-feedback').textContent()).length > 15);
      await page.locator(`input[value="${correct}"]`).check();
      await page.locator('[data-complete]').click();
      assert.equal(await page.locator('[data-complete]').isDisabled(), true);
      await page.reload();
      assert.match(await page.locator('[data-complete]').textContent(), /已学完/);
      await page.locator(`input[value="${wrong}"]`).check();
      await page.reload();
      assert.match(await page.locator('[data-complete]').textContent(), /已学完/);
    }
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    assert.equal(stored.completed.length, 4);
    await page.goto(base);
    assert.equal(await page.locator('.path-step.done').count(), 4);
  });
  await check('模板下载、任务卡拼接与输入不保存', async () => {
    await page.goto(`${base}#/toolkit`);
    await page.locator('[data-copy-builder]').click();
    assert.equal(await page.locator('[data-builder="context"]').evaluate(el => document.activeElement === el), true);
    const values = ['虚构活动通知 <img src=x onerror=alert(1)>', '写短通知', '标题与三项信息', '缺失信息写待确认'];
    for (const [i, field] of (await page.locator('[data-builder]').all()).entries()) await field.fill(values[i]);
    assert.equal(await page.locator('#builder-output img').count(), 0);
    await page.locator('[data-copy-builder]').click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /缺失信息写待确认/);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('[data-download]').click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /四张提示词模板.txt/);
    await download.saveAs(new URL('downloaded-templates.txt', output).pathname);
    await page.locator('.template-card [data-copy]').first().click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), lessons[0].template);
    await page.reload();
    assert.equal(await page.locator('[data-builder="context"]').inputValue(), '');
    const stored = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
    assert.equal(stored.includes('img'), false);
  });
  await check('重置进度可取消、可确认', async () => {
    await page.goto(`${base}#/guide`);
    await page.locator('[data-reset]').click();
    await page.locator('[data-cancel-reset]').click();
    await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).completed.length, STORAGE_KEY), 4);
    await page.locator('[data-reset]').click();
    await page.locator('[data-confirm-reset]').click();
    await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).completed.length, STORAGE_KEY), 0);
  });
  await check('360 / 390 / 768 像素：全页面无溢出，手机导航可用', async () => {
    for (const width of [360, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['#/', '#/lesson/email', '#/lesson/meeting', '#/lesson/reading', '#/lesson/report', '#/toolkit', '#/guide']) {
        await page.goto(`${base}${route}`); await page.locator('h1').waitFor(); await noOverflow(page);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await page.screenshot({ path: new URL('home-mobile.png', output).pathname, fullPage: true });
    await page.locator('.course-card').first().click();
    await page.locator('[data-section-select]').selectOption('compare');
    await page.waitForFunction(() => { const y = document.querySelector('#compare').getBoundingClientRect().top; return y >= 105 && y < 220; });
    await page.screenshot({ path: new URL('lesson-mobile-compare.png', output).pathname, fullPage: false });
    await page.goto(`${base}#/lesson/email`);
    await page.screenshot({ path: new URL('lesson-mobile.png', output).pathname, fullPage: true });
  });
  await check('复制权限失败时提供可选中的手动复制文本', async () => {
    const isolated = await browser.newContext();
    await isolated.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
      document.execCommand = () => false;
    });
    const blockedPage = await isolated.newPage();
    await blockedPage.goto(`${base}#/lesson/email`);
    await blockedPage.locator('.prompt-toolbar [data-copy]').click();
    assert.equal(await blockedPage.locator('dialog').isVisible(), true);
    assert.equal(await blockedPage.locator('dialog textarea').inputValue(), fullPrompt(lessons[0]));
    await blockedPage.locator('dialog form button').click();
    await blockedPage.locator('dialog').waitFor({ state: 'detached' });
    await blockedPage.locator('.prompt-toolbar [data-copy]').click();
    await blockedPage.keyboard.press('Escape');
    await blockedPage.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await blockedPage.locator('dialog').count(), 0);
    await isolated.close();
  });
  await check('禁用存储与损坏的本地数据不会阻断学习', async () => {
    const isolated = await browser.newContext();
    await isolated.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const blockedPage = await isolated.newPage();
    await blockedPage.goto(base);
    assert.equal(await blockedPage.locator('.course-card').count(), 4);
    assert.equal(await blockedPage.locator('.storage-warning').isVisible(), true);
    await blockedPage.goto(`${base}#/lesson/email`);
    await blockedPage.locator('input[value="1"]').check();
    await blockedPage.locator('[data-complete]').click();
    assert.match(await blockedPage.locator('[data-complete]').textContent(), /已学完/);
    await isolated.close();
    await page.evaluate(key => localStorage.setItem(key, '{corrupt'), STORAGE_KEY);
    await page.goto(base); await page.reload();
    assert.equal(await page.locator('.course-card').count(), 4);
  });
  await check('未知路由恢复、同链接重复点击、浏览器后退', async () => {
    await page.goto(`${base}#/lesson/unknown`);
    assert.equal(await page.locator('.not-found').isVisible(), true);
    await page.locator('.not-found a').click();
    await page.locator('.course-card').first().click();
    await page.locator('.lesson-nav a').first().click();
    assert.equal(await page.locator('.lesson-article').count(), 1);
    await page.goBack();
    assert.equal(await page.locator('.course-card').count(), 4);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}#/lesson/email`);
  await page.screenshot({ path: new URL('lesson-desktop.png', output).pathname, fullPage: true });
  await page.goto(`${base}#/lesson/report?section=result`);
  await page.screenshot({ path: new URL('report-desktop.png', output).pathname });
  await page.goto(`${base}#/toolkit`);
  await page.screenshot({ path: new URL('toolkit-desktop.png', output).pathname, fullPage: true });
  await check('应用没有 JavaScript 异常，也没有自动外部请求', async () => {
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  });
  await writeFile(new URL('browser-results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), browser: await browser.version(), base, results, errors, externalRequests }, null, 2));
  console.log(`\n${results.length} 组浏览器检查通过。截图与结果：artifacts/`);
} finally { await browser.close(); }
