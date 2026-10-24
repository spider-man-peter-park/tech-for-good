import { fullPrompt, finalText } from './content.js';
import { loadProgress, saveProgress, STORAGE_KEY } from './state.js';
import { getLocaleData, resolveLocale, saveLocale, supportedLocales, interpolate } from './i18n.js';

const main = document.querySelector('#main');
let storage;
try { storage = window.localStorage; } catch { /* Storage may be disabled. */ }
let { data: progress, available: storageAvailable } = loadProgress(storage);
let locale = resolveLocale(storage, location.search);
let { ui: u, lessons, sourceReference } = getLocaleData(locale);
let currentPath = '';
let hasRendered = false;
let toastTimer;
let copySequence = 0;
const copies = new Map();
const copyTimers = new WeakMap();
const sectionIds = ['source', 'diagram', 'prompt', 'compare', 'followup', 'result', 'practice', 'check'];
const fieldNames = ['context', 'task', 'format', 'boundary'];
const icons = {
  mail: '<rect x="4" y="7" width="24" height="19" rx="3"/><path d="m5 9 11 9L27 9"/>',
  notes: '<path d="M11 6H7a2 2 0 0 0-2 2v19a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4"/><rect x="11" y="3" width="10" height="6" rx="2"/><path d="M11 15h11M11 21h8M8 15h.1M8 21h.1"/>',
  book: '<path d="M16 8v21M16 8C12 4 7 4 3 5v21c5-1 9 0 13 3 4-3 8-4 13-3V5c-4-1-9-1-13 3Z"/><path d="m7 11 5 1M7 16l5 1M20 12l5-1M20 17l5-1"/>',
  chart: '<rect x="3" y="4" width="26" height="21" rx="3"/><path d="M16 25v5M10 30h12M9 19v-5M16 19V9M23 19v-8"/>'
};
const t = (key, values) => interpolate(u[key], values);
function escape(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`; }
function copyButton(text, label = u.copyPrompt, cls = '') {
  const key = `copy-${copySequence++}`;
  copies.set(key, text);
  return `<button class="copy-button ${cls}" data-copy="${key}"><span aria-hidden="true">▣</span> ${label}</button>`;
}
function toast(message) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer); el.textContent = message; el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}
function persist() {
  if (!saveProgress(storage, progress)) { storageAvailable = false; toast(u.storageToast); }
}
function localizeShell() {
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  document.querySelector('meta[name="description"]').content = u.metaDescription;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = u[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', u[el.dataset.i18nAria]); });
  document.querySelectorAll('[data-locale]').forEach(button => {
    const active = button.dataset.locale === locale;
    button.setAttribute('aria-pressed', String(active)); button.classList.toggle('active', active);
  });
}
function progressMap() {
  return `<section class="progress-panel" aria-label="${u.progressLabel}"><div class="progress-intro"><span class="mini-label">YOUR LEARNING PATH</span><h2>${u.pathTitle}</h2><p>${u.pathDescription}</p></div>
    <div class="path-steps">${lessons.map(lesson => `<a href="#/lesson/${lesson.id}" class="path-step ${progress.completed.includes(lesson.id) ? 'done' : ''}"><span class="path-circle">${progress.completed.includes(lesson.id) ? '✓' : lesson.number}</span><span>${lesson.shortTitle}</span></a>`).join('')}</div>
    <div class="progress-count"><strong>${progress.completed.length}<small> / ${lessons.length}</small></strong><span>${u.completedCount}</span></div>${!storageAvailable ? `<p class="storage-warning">${u.storageWarning}</p>` : ''}</section>`;
}
function cardArt(lesson) {
  const details = {
    email: `<div class="art-mail"><span>${u.artMailSubject}</span><i></i><i></i><i></i><b>${u.artMailChecks}</b></div><span class="art-sticker">${u.artMailSticker}</span>`,
    meeting: `<div class="art-note"><span>${u.artMeetingTitle}</span><p>✓ &nbsp;${u.artMeetingTasks[0]} <b>4/10</b></p><p>✓ &nbsp;${u.artMeetingTasks[1]} <b>4/09</b></p><p>○ &nbsp;${u.artMeetingTasks[2]} <b>${u.pending}</b></p></div><span class="art-sticker">${u.artMeetingSticker}</span>`,
    reading: `<div class="art-reading"><span>${u.artArticle}</span><i></i><i></i><mark>${u.artEvidence}</mark><i></i></div><div class="art-extract"><span>${u.artReadingCard}</span><p>${u.artFindings} <b>↗ [2]</b></p><p>${u.artLimits} <b>↗ [3]</b></p><p>${u.artQuestions}</p></div>`,
    report: `<div class="art-report"><span>${u.artReportTitle}</span><div><b>3<small>${u.artMetrics[0]}</small></b><b>48<small>${u.artMetrics[1]}</small></b><b>72%<small>${u.artMetrics[2]}</small></b></div><i></i></div><span class="art-sticker">${u.artReportSticker}</span>`
  };
  return `<div class="course-art ${lesson.color}" aria-hidden="true"><span class="art-number">${lesson.number}</span>${details[lesson.id]}</div>`;
}
function home() {
  const next = lessons.find(lesson => !progress.completed.includes(lesson.id)) || lessons[0];
  return `<div class="page home-page"><section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-dot"></span>${u.heroEyebrow}</span><h1>${u.heroTitleHtml}</h1><p class="hero-description">${u.heroDescriptionHtml}</p>
    <div class="hero-actions"><a class="button primary" href="#/lesson/${next.id}">${progress.completed.length && progress.completed.length < lessons.length ? u.continueLearning : u.firstLesson} <span aria-hidden="true">↗</span></a><a class="text-link" href="#/?section=courses">${u.browseLessons} <span aria-hidden="true">↓</span></a></div><div class="hero-facts">${u.heroFacts.map(text => `<span>✓ ${text}</span>`).join('')}</div></div>
    <div class="hero-visual"><img src="./assets/hero${locale === 'en' ? '-en' : ''}.svg" width="580" height="430" alt="${escape(u.heroAlt)}"/><span class="visual-caption">${u.heroCaption}</span></div></section>${progressMap()}
    <section id="courses" class="courses-section"><div class="section-heading"><div><span class="mini-label">SMALL TASKS, REAL PROGRESS</span><h2>${u.coursesTitle}<span class="heading-dot">.</span></h2><p>${u.coursesDescription}</p></div><span class="section-meta">${u.courseCount} <span aria-hidden="true">↙</span></span></div>
    <div class="course-grid">${lessons.map(lesson => `<a class="course-card" href="#/lesson/${lesson.id}">${cardArt(lesson)}<div class="course-card-content"><div class="course-meta"><span>${lesson.tag}</span><span>${t('duration', { minutes: lesson.minutes })}</span></div><h3>${lesson.title}<span class="card-arrow" aria-hidden="true">↗</span></h3><p>${lesson.subtitle}</p><div class="course-bottom"><span>${u.cardFeatures}</span><span class="course-state ${progress.completed.includes(lesson.id) ? 'is-done' : ''}">${progress.completed.includes(lesson.id) ? u.completed : u.startLesson}</span></div></div></a>`).join('')}</div></section>
    <section class="method-teaser"><div><span class="mini-label">A LITTLE METHOD GOES A LONG WAY</span><h2>${u.methodTitleHtml}</h2><a class="text-link" href="#/toolkit">${u.takeTemplates} <span aria-hidden="true">↗</span></a></div><div class="method-four">${u.methodLabels.map((title, i) => `<div><span>0${i + 1}</span><h3>${title}</h3><p>${u.methodDescriptions[i]}</p></div>`).join('')}</div></section>
    <div class="home-note"><span aria-hidden="true">✳</span><p>${u.homeNote}</p><a href="#/guide">${u.guideNav} ↗</a></div></div>`;
}
function sectionHead(index, subtitle = '') { return `<div class="lesson-section-heading"><span>${String(index).padStart(2, '0')}</span><div><h2>${u.sectionTitles[index - 1]}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>`; }
function diagram(lesson) {
  return `<figure class="flow-figure"><div class="flow-steps" role="img" aria-label="${u.flowAria}${escape(lesson.diagram.join(u.flowJoin))}">${lesson.diagram.map((text, i) => `<div class="flow-step"><span class="flow-node ${i === 1 ? lesson.color : ''}">${i === 0 ? icon(lesson.icon) : i === 1 ? '✳' : i === 2 ? icon('notes') : '✓'}</span><strong>${text}</strong><small>${u.flowHints[i]}</small></div>${i < 3 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div><figcaption>${u.flowCaption}</figcaption></figure>`;
}
function resultBlocks(lesson) {
  return lesson.final.blocks.map(block => {
    if (block.type === 'list') return `<ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    if (block.type === 'table') return `<div class="table-scroll" tabindex="0" role="region" aria-label="${u.tableAria}"><table><thead><tr>${block.headers.map(text => `<th scope="col">${escape(text)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(text => `<td>${escape(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (block.type === 'metrics') return `<div class="metric-grid">${block.items.map(item => `<div><strong>${escape(item.value)}</strong><span>${escape(item.label)}</span></div>`).join('')}</div>`;
    if (block.type === 'heading') return `<h4>${escape(block.text)}</h4>`;
    if (block.type === 'meta') return `<p class="result-meta"><strong>${escape(block.label)}${locale === 'en' ? ': ' : '：'}</strong>${escape(block.text)}</p>`;
    if (block.type === 'callout') return `<p class="result-callout">${escape(block.text)}</p>`;
    return `<p>${escape(block.text)}</p>`;
  }).join('');
}
function quizContent(lesson) {
  const selected = progress.answers[lesson.id];
  const selectedOption = lesson.quiz.options[selected];
  return `<fieldset class="quiz"><legend>${lesson.quiz.question}</legend><p class="quiz-instruction">${u.quizInstruction}</p><div class="quiz-options">${lesson.quiz.options.map((option, i) => `<label class="quiz-option ${selected === i ? option.correct ? 'correct' : 'incorrect' : ''}"><input type="radio" name="quiz-${lesson.id}" value="${i}" data-quiz="${lesson.id}" ${selected === i ? 'checked' : ''}/><span>${option.text}</span>${selected === i ? `<span class="answer-symbol" aria-hidden="true">${option.correct ? '✓' : '↻'}</span>` : ''}</label>`).join('')}</div><p class="quiz-feedback ${selectedOption?.correct ? 'success' : ''}" role="status" aria-live="polite">${selectedOption ? escape(selectedOption.feedback) : u.quizUnanswered}</p></fieldset>`;
}
function completeButton(lesson) {
  const done = progress.completed.includes(lesson.id);
  const correct = lesson.quiz.options[progress.answers[lesson.id]]?.correct;
  return `<button class="button primary complete-button" data-complete="${lesson.id}" ${done || !correct ? 'disabled' : ''}>${done ? u.completeDone : correct ? u.completeAction : u.completeBlocked}</button>`;
}
function lessonPage(lesson) {
  const index = lessons.indexOf(lesson);
  const next = lessons[index + 1];
  return `<div class="page lesson-layout"><aside class="lesson-sidebar"><a class="back-link" href="#/">← ${u.backCourses}</a><span class="mini-label">${u.fourLessons}</span><nav aria-label="${u.courseNavigation}" class="lesson-nav">${lessons.map(item => `<a href="#/lesson/${item.id}" ${item.id === lesson.id ? 'aria-current="page"' : ''}><span class="lesson-nav-number">${progress.completed.includes(item.id) ? '✓' : item.number}</span>${item.shortTitle}</a>`).join('')}</nav><div class="sidebar-progress"><div><span>${u.progressLabel}</span><strong>${progress.completed.length} / ${lessons.length}</strong></div><progress value="${progress.completed.length}" max="${lessons.length}" aria-label="${u.completedAria}"></progress><small>${u.localProgress}</small></div><nav aria-label="${u.lessonContents}" class="toc"><span class="mini-label">${u.lessonRoute}</span>${sectionIds.map((id, i) => `<a href="#/lesson/${lesson.id}?section=${id}"><span>${i + 1}</span>${u.sections[i]}</a>`).join('')}</nav></aside>
    <article class="lesson-article"><div class="breadcrumb"><a href="#/">${u.homeNav}</a><span>/</span>${t('lessonNumber', { number: lesson.number })}</div><div class="lesson-title"><span class="eyebrow">${icon(lesson.icon)} ${lesson.tag} <span class="label-divider">/</span> ${t('duration', { minutes: lesson.minutes })}</span><h1>${lesson.title}</h1><p>${lesson.subtitle}</p></div><div class="lesson-outcome"><span aria-hidden="true">↗</span><div><strong>${u.outcomeTitle}</strong><p>${t('outcomeDescription', { outcome: lesson.outcome, skill: lesson.skill })}</p></div></div><p class="lesson-scene">${lesson.scene}</p>
    <div class="mobile-toc"><label for="section-select">${u.jumpStep}</label><select id="section-select" data-section-select="${lesson.id}"><option value="">${u.chooseStep}</option>${sectionIds.map((id, i) => `<option value="${id}">${i + 1}. ${u.sections[i]}</option>`).join('')}</select></div>
    <section class="lesson-section" id="source">${sectionHead(1, u.sourceIntro)}<div class="source-card"><div class="source-card-title"><span>${lesson.sourceTitle}</span><span class="fiction-badge">${u.fictional}</span></div><pre>${escape(lesson.source)}</pre>${copyButton(lesson.source, u.copySource, 'source-copy')}</div></section>
    <section class="lesson-section" id="diagram">${sectionHead(2)}${diagram(lesson)}<div class="goal-grid">${lesson.goal.map((value, i) => `<div><span>${u.methodLabels[i]}</span><p>${value}</p></div>`).join('')}</div></section>
    <section class="lesson-section" id="prompt">${sectionHead(3, u.promptIntro)}<div class="prompt-panel"><div class="prompt-toolbar"><span><span class="tiny-dot"></span> ${u.promptReady}</span>${copyButton(fullPrompt(lesson), u.copyFullPrompt)}</div><pre>${escape(lesson.prompt)}</pre><details class="prompt-source"><summary>${u.promptSource}</summary><pre>${escape(lesson.source)}</pre></details></div><p class="small-note">${u.promptNote}</p></section>
    <section class="lesson-section" id="compare">${sectionHead(4)}<div class="comparison-controls" role="group" aria-label="${u.compareAria}"><button class="active" data-compare="both" aria-pressed="true">${u.compareBoth}</button><button data-compare="before" aria-pressed="false">${u.compareBefore}</button><button data-compare="after" aria-pressed="false">${u.compareAfter}</button></div><div class="comparison" data-view="both"><div class="compare-card before"><div class="compare-label"><span>${u.firstDraft}</span><span>${u.draftWarning}</span></div><p class="compare-output">${escape(lesson.before)}</p><ul>${lesson.beforeNotes.map(note => `<li>${note}</li>`).join('')}</ul></div><div class="compare-card after"><div class="compare-label"><span>${u.improved}</span><span>${u.improvedHint}</span></div><p class="compare-output">${escape(lesson.after)}</p><ul>${lesson.afterNotes.map(note => `<li>${note}</li>`).join('')}</ul></div></div><p class="comparison-takeaway"><span aria-hidden="true">✳</span>${lesson.comparisonLesson}</p></section>
    <section class="lesson-section" id="followup">${sectionHead(5, u.followupIntro)}<div class="followup-list">${lesson.followups.map((item, i) => `<div class="followup-card"><span class="followup-index">0${i + 1}</span><div><h3>${item.title}</h3><p>${item.text}</p><small>${item.why}</small></div>${copyButton(item.text, u.copyFollowup)}</div>`).join('')}</div></section>
    <section class="lesson-section" id="result">${sectionHead(6, u.resultIntro)}<div class="result-document"><div class="document-toolbar"><span>${lesson.final.eyebrow}</span>${copyButton(finalText(lesson, locale), u.copyResult)}</div><div class="document-content"><h3>${lesson.final.title}</h3>${resultBlocks(lesson)}</div></div></section>
    <section class="lesson-section" id="practice">${sectionHead(7)}<div id="quiz-container">${quizContent(lesson)}</div></section>
    <section class="lesson-section" id="check">${sectionHead(8)}<div class="check-columns"><div class="check-card"><h3><span aria-hidden="true">✓</span> ${u.factsTitle}</h3><ul>${lesson.checks.map(text => `<li>${text}</li>`).join('')}</ul></div><div class="check-card privacy"><h3><span aria-hidden="true">◇</span> ${u.privacyTitle}</h3><ul>${lesson.privacy.map(text => `<li>${text}</li>`).join('')}</ul></div></div><p class="reference-note">${u.referenceLabel}<a href="${sourceReference.url}" target="_blank" rel="noopener noreferrer">${u.referenceTitle} ↗</a>${u.referenceDetail}</p></section>
    <div class="lesson-finish"><div><span class="mini-label">ONE SMALL STEP, WELL DONE</span><h2>${u.finishTitle}</h2><p>${u.finishDescription}</p></div><div id="completion-control">${completeButton(lesson)}</div></div><div class="lesson-pagination">${index > 0 ? `<a href="#/lesson/${lessons[index - 1].id}">← ${u.previousLesson}${lessons[index - 1].shortTitle}</a>` : `<a href="#/">← ${u.allLessons}</a>`}${next ? `<a href="#/lesson/${next.id}">${u.nextLesson}${next.shortTitle} →</a>` : `<a href="#/toolkit">${u.takeTemplatesShort} →</a>`}</div></article></div>`;
}
function toolkit() {
  return `<div class="page toolbox-page"><div class="page-heading"><span class="eyebrow">${u.toolkitEyebrow}</span><h1>${u.toolkitTitle}<span class="heading-dot">.</span></h1><p>${u.toolkitDescription}</p></div><section class="builder-section"><div class="builder-intro"><span class="mini-label">MAKE IT YOURS</span><h2>${u.builderTitle}</h2><p>${u.builderDescription}</p><p class="small-note">${u.builderNote}</p></div><div class="builder"><div class="builder-fields">${fieldNames.map((name, i) => `<label for="builder-${name}"><span>${u.methodLabels[i]}</span><textarea id="builder-${name}" data-builder="${name}" rows="2" maxlength="2000" placeholder="${u.builderPlaceholders[i]}"></textarea></label>`).join('')}</div><div class="builder-preview"><span class="mini-label">${u.builderCard}</span><pre id="builder-output"></pre><button class="button primary" data-copy-builder>${u.builderCopy} <span aria-hidden="true">▣</span></button><p class="small-note">${u.builderCopyNote}</p></div></div></section>
    <section class="template-section"><div class="section-heading"><div><span class="mini-label">READY TO REUSE</span><h2>${u.templatesTitle}</h2><p>${u.templatesDescription}</p></div><button class="button secondary" data-download>${u.downloadAll} ↓</button></div><div class="template-grid">${lessons.map(lesson => `<article class="template-card"><div class="template-title"><span class="template-icon ${lesson.color}">${icon(lesson.icon)}</span><div><span>${t('templateNumber', { number: lesson.number })}</span><h3>${lesson.shortTitle}</h3></div></div><pre>${escape(lesson.template)}</pre><div class="template-actions">${copyButton(lesson.template, u.copyTemplate)}<a href="#/lesson/${lesson.id}">${u.fullLesson} ↗</a></div></article>`).join('')}</div></section></div>`;
}
function guide() {
  return `<div class="page guide-page"><div class="page-heading"><span class="eyebrow">${u.guideEyebrow}</span><h1>${u.guideTitleHtml}</h1><p>${u.guideDescription}</p></div><div class="guide-layout"><section class="guide-card"><span class="mini-label">${u.guideStartLabel}</span><h2>${u.guideStartTitle}</h2><ol>${u.guideStartList.map(text => `<li>${text}</li>`).join('')}</ol><p>${u.guideTools}</p></section>
    <section class="guide-card"><span class="mini-label">${u.guideMethodLabel}</span><h2>${u.guideMethodTitle}</h2><p>${u.guideMethodExample}</p><p>${u.guideMethodAdvice}</p><a class="text-link" href="#/toolkit">${u.openToolkit} ↗</a></section><section class="guide-card"><span class="mini-label">${u.guideCheckLabel}</span><h2>${u.guideCheckTitle}</h2><p>${u.guideCheckDescription}</p><ul>${u.guideCheckList.map(text => `<li>${text}</li>`).join('')}</ul><p class="reference-note">${u.referenceLabel}<a href="${sourceReference.url}" target="_blank" rel="noopener noreferrer">${sourceReference.title} ↗</a><br>${sourceReference.detail}</p></section>
    <section class="guide-card"><span class="mini-label">${u.guidePrivacyLabel}</span><h2>${u.guidePrivacyTitle}</h2><p>${u.guidePrivacyStorage}</p><p>${u.guidePrivacyNetwork}</p><p>${u.guidePrivacyLimits}</p><div class="reset-row"><span>${u.resetCount} <strong>${progress.completed.length} / ${lessons.length}</strong></span><button class="button secondary" data-reset>${u.resetButton}</button></div></section><section class="guide-card full-width"><span class="mini-label">${u.aboutLabel}</span><h2>${u.aboutTitle}</h2><p>${u.aboutExamples}</p><p>${u.aboutLicense}</p><a class="button primary" href="#/lesson/email">${u.firstLesson} ↗</a></section></div></div>`;
}
function route() {
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  if (path !== currentPath) {
    copies.clear(); currentPath = path;
    const lesson = path.startsWith('/lesson/') ? lessons.find(item => path === `/lesson/${item.id}`) : undefined;
    const page = lesson ? 'lesson' : path === '/toolkit' ? 'toolkit' : path === '/guide' ? 'guide' : path === '/' ? 'home' : 'missing';
    main.innerHTML = lesson ? lessonPage(lesson) : page === 'home' ? home() : page === 'toolkit' ? toolkit() : page === 'guide' ? guide() : `<div class="page not-found"><span class="eyebrow">${u.missingEyebrow}</span><h1>${u.missingTitle}</h1><p>${u.missingDescription}</p><a class="button primary" href="#/">${u.missingBack} →</a></div>`;
    document.title = `${lesson ? lesson.title : page === 'toolkit' ? u.toolkitNav : page === 'guide' ? u.guideNav : page === 'missing' ? u.missingPageTitle : u.homeTitle} · ${u.siteName}`;
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === (page === 'lesson' ? 'home' : page)) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (page === 'toolkit') updateBuilder();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (hasRendered) main.focus({ preventScroll: true });
    hasRendered = true;
    if (page === 'lesson' && !storageAvailable) main.querySelector('.lesson-title').insertAdjacentHTML('afterend', `<p class="storage-warning">${u.lessonStorageWarning}</p>`);
  }
  const section = params.get('section');
  if (section) {
    const target = document.getElementById(section);
    if (target && main.contains(target)) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    const select = document.querySelector('#section-select'); if (select) select.value = section;
  }
}
function updateBuilder() {
  const lines = [...document.querySelectorAll('[data-builder]')].map((field, i) => `${u.builderLabels[i]}${locale === 'en' ? ': ' : '：'}${field.value.trim() || t('builderFill', { label: u.builderLabels[i] })}`);
  if (u.builderLanguage) lines.unshift(u.builderLanguage);
  document.querySelector('#builder-output').textContent = lines.join('\n\n');
}
function setComparison(view) {
  document.querySelector('.comparison').dataset.view = view;
  document.querySelectorAll('[data-compare]').forEach(button => {
    const active = button.dataset.compare === view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}
function changeLanguage(nextLocale, { remember = true, updateAddress = true, preserveView = true, focusSwitch = true } = {}) {
  if (!supportedLocales.includes(nextLocale) || nextLocale === locale) return;
  const savedScroll = window.scrollY;
  const anchor = [...document.querySelectorAll('.lesson-section')].reverse().find(el => el.getBoundingClientRect().top <= document.querySelector('.site-header').offsetHeight + 40);
  const position = anchor ? { id: anchor.id, top: anchor.getBoundingClientRect().top } : null;
  const draft = [...document.querySelectorAll('[data-builder]')].map(el => el.value);
  const comparison = document.querySelector('.comparison')?.dataset.view;
  const expanded = document.querySelector('.prompt-source')?.open;
  locale = nextLocale; ({ ui: u, lessons, sourceReference } = getLocaleData(locale));
  if (remember) saveLocale(storage, locale);
  if (updateAddress) {
    const url = new URL(location.href); url.searchParams.set('lang', locale); history.replaceState(null, '', url);
  }
  clearTimeout(toastTimer); document.querySelector('#toast').hidden = true;
  localizeShell(); currentPath = ''; route();
  if (preserveView) {
    if (draft.length) { document.querySelectorAll('[data-builder]').forEach((el, i) => { el.value = draft[i]; }); updateBuilder(); }
    if (comparison && document.querySelector('.comparison')) setComparison(comparison);
    if (expanded && document.querySelector('.prompt-source')) document.querySelector('.prompt-source').open = true;
    const newAnchor = position && document.getElementById(position.id);
    window.scrollTo({ top: newAnchor ? window.scrollY + newAnchor.getBoundingClientRect().top - position.top : savedScroll, behavior: 'instant' });
  }
  if (focusSwitch) document.querySelector(`[data-locale="${locale}"]`).focus({ preventScroll: true });
}
async function copyText(value) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; } }
  catch { /* Use local selection if Clipboard API permission is unavailable. */ }
  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea'); textarea.value = value; textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.append(textarea); textarea.select();
  let success = false;
  try { success = document.execCommand('copy'); } catch { /* Offer manual copying. */ }
  textarea.remove(); previousFocus?.focus({ preventScroll: true });
  if (!success) {
    const dialog = document.createElement('dialog'); dialog.className = 'copy-dialog';
    dialog.innerHTML = `<h2>${u.manualCopyTitle}</h2><p>${u.manualCopyDescription}</p><textarea aria-label="${u.manualCopyAria}" rows="12" readonly></textarea><form method="dialog"><button class="button primary">${u.close}</button></form>`;
    dialog.querySelector('textarea').value = value; document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); dialog.querySelector('textarea').select();
  }
  return success;
}
async function handleCopy(button, value) {
  if (!value) return;
  const success = await copyText(value);
  if (!success || !button.isConnected) return;
  if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
  clearTimeout(copyTimers.get(button)); button.innerHTML = `<span aria-hidden="true">✓</span> ${u.copied}`;
  button.classList.add('copied'); toast(u.copiedToast);
  copyTimers.set(button, setTimeout(() => { button.innerHTML = button.dataset.originalLabel; button.classList.remove('copied'); }, 2000));
}
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus({ preventScroll: true }); main.scrollIntoView({ block: 'start' }); return; }
  const button = event.target.closest('button');
  if (button?.dataset.locale) { changeLanguage(button.dataset.locale); return; }
  if (button?.dataset.copy) await handleCopy(button, copies.get(button.dataset.copy));
  if (button?.hasAttribute('data-copy-builder')) {
    const emptyField = [...document.querySelectorAll('[data-builder]')].find(field => !field.value.trim());
    if (emptyField) { toast(u.builderMissing); emptyField.focus(); return; }
    await handleCopy(button, document.querySelector('#builder-output').textContent);
  }
  if (button?.dataset.compare) setComparison(button.dataset.compare);
  if (button?.dataset.complete) {
    const id = button.dataset.complete; const lesson = lessons.find(item => item.id === id);
    if (lesson?.quiz.options[progress.answers[id]]?.correct && !progress.completed.includes(id)) {
      progress.completed.push(id); persist(); const savedScroll = window.scrollY;
      currentPath = ''; route(); window.scrollTo({ top: savedScroll, behavior: 'instant' });
      toast(t('completionToast', { number: lesson.number, count: progress.completed.length }));
      document.querySelector('.complete-button')?.focus({ preventScroll: true });
    }
  }
  if (button?.hasAttribute('data-download')) {
    const text = [u.downloadTitle, u.downloadNotice, ...lessons.map(lesson => `${lesson.number} ${lesson.shortTitle}\n\n${lesson.template}`)].join('\n\n────────────\n\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = u.downloadName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast(u.downloadToast);
  }
  if (button?.hasAttribute('data-reset')) {
    const dialog = document.createElement('dialog'); dialog.className = 'reset-dialog';
    dialog.innerHTML = `<h2>${u.resetTitle}</h2><p>${u.resetDescription}</p><div class="dialog-actions"><button class="button secondary" data-cancel-reset>${u.resetCancel}</button><button class="button primary" data-confirm-reset>${u.resetConfirm}</button></div>`;
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('[data-cancel-reset]').focus();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('[data-cancel-reset]').onclick = () => dialog.close();
    dialog.querySelector('[data-confirm-reset]').onclick = () => {
      progress = { version: 1, completed: [], answers: {} }; persist(); dialog.close(); currentPath = ''; route(); toast(u.resetToast);
    };
  }
  const link = event.target.closest('a[href^="#/"]');
  if (link && link.hash === location.hash) {
    event.preventDefault(); if (location.hash.includes('?section=')) route(); else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.quiz) {
    const lesson = lessons.find(item => item.id === input.dataset.quiz); const index = Number(input.value);
    if (!lesson || !lesson.quiz.options[index]) return;
    progress.answers[lesson.id] = index; persist();
    document.querySelector('#quiz-container').innerHTML = quizContent(lesson);
    document.querySelector('#completion-control').innerHTML = completeButton(lesson);
    document.querySelector(`input[name="quiz-${lesson.id}"][value="${index}"]`)?.focus({ preventScroll: true });
  }
  if (input.dataset.sectionSelect && input.value) location.hash = `/lesson/${input.dataset.sectionSelect}?section=${input.value}`;
});
document.addEventListener('input', event => { if (event.target.dataset.builder) updateBuilder(); });
window.addEventListener('hashchange', route);
window.addEventListener('popstate', () => {
  const requested = resolveLocale(storage, location.search);
  if (requested !== locale) changeLanguage(requested, { remember: false, updateAddress: false, preserveView: false, focusSwitch: false });
});
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    const loaded = loadProgress(storage); progress = loaded.data; storageAvailable = loaded.available;
    const savedScroll = window.scrollY; currentPath = ''; route(); window.scrollTo({ top: savedScroll, behavior: 'instant' });
  }
});
localizeShell();
route();
