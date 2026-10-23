import { lessons, fullPrompt, finalText, sourceReference } from './content.js';
import { loadProgress, saveProgress, STORAGE_KEY } from './state.js';

const main = document.querySelector('#main');
let storage;
try { storage = window.localStorage; } catch { /* 浏览器可能禁用存储 */ }
let { data: progress, available: storageAvailable } = loadProgress(storage);
let currentPath = '';
let hasRendered = false;
let toastTimer;
let copySequence = 0;
const copies = new Map();
const copyTimers = new WeakMap();
const icons = {
  mail: '<rect x="4" y="7" width="24" height="19" rx="3"/><path d="m5 9 11 9L27 9"/>',
  notes: '<path d="M11 6H7a2 2 0 0 0-2 2v19a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4"/><rect x="11" y="3" width="10" height="6" rx="2"/><path d="M11 15h11M11 21h8M8 15h.1M8 21h.1"/>',
  book: '<path d="M16 8v21M16 8C12 4 7 4 3 5v21c5-1 9 0 13 3 4-3 8-4 13-3V5c-4-1-9-1-13 3Z"/><path d="m7 11 5 1M7 16l5 1M20 12l5-1M20 17l5-1"/>',
  chart: '<rect x="3" y="4" width="26" height="21" rx="3"/><path d="M16 25v5M10 30h12M9 19v-5M16 19V9M23 19v-8"/>'
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`; }
function escape(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function copyButton(text, label = '复制提示词', cls = '') {
  const key = `copy-${copySequence++}`;
  copies.set(key, text);
  return `<button class="copy-button ${cls}" data-copy="${key}"><span aria-hidden="true">▣</span> ${label}</button>`;
}
function toast(message) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer);
  el.textContent = message; el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}
function persist() {
  if (!saveProgress(storage, progress)) {
    storageAvailable = false;
    toast('此浏览器无法保存进度；你仍可继续学习，本次进度暂留在页面中。');
  }
}
function progressMap() {
  return `<section class="progress-panel" aria-label="学习进度"><div class="progress-intro"><span class="mini-label">YOUR LEARNING PATH</span><h2>你的上手地图</h2><p>每学会一件小事，就向前一步。</p></div><div class="path-steps">${lessons.map(lesson => `<a href="#/lesson/${lesson.id}" class="path-step ${progress.completed.includes(lesson.id) ? 'done' : ''}"><span class="path-circle">${progress.completed.includes(lesson.id) ? '✓' : lesson.number}</span><span>${lesson.shortTitle}</span></a>`).join('')}</div><div class="progress-count"><strong>${progress.completed.length}<small> / 4</small></strong><span>节课已完成</span></div>${!storageAvailable ? '<p class="storage-warning">浏览器存储不可用，刷新后进度可能丢失。</p>' : ''}</section>`;
}
function cardArt(lesson) {
  const details = {
    email: '<div class="art-mail"><span>主题：咨询活动室使用安排</span><i></i><i></i><i></i><b>礼貌 ✓ &nbsp; 清楚 ✓</b></div><span class="art-sticker">发送前，核对一下</span>',
    meeting: '<div class="art-note"><span>下一步，谁来做？</span><p>✓ &nbsp;交海报初稿 <b>4/10</b></p><p>✓ &nbsp;询问场地 <b>4/09</b></p><p>○ &nbsp;确认签到分工 <b>待确认</b></p></div><span class="art-sticker">讨论 ≠ 已决定</span>',
    reading: '<div class="art-reading"><span>一篇长文</span><i></i><i></i><mark>结论要有出处</mark><i></i></div><div class="art-extract"><span>阅读卡片</span><p>发现 <b>↗ [2]</b></p><p>局限 <b>↗ [3]</b></p><p>还要问什么？</p></div>',
    report: '<div class="art-report"><span>这个月，进展如何？</span><div><b>3<small>场活动</small></b><b>48<small>人次到访</small></b><b>72%<small>预算使用</small></b></div><i></i></div><span class="art-sticker">一页，说清楚</span>'
  };
  return `<div class="course-art ${lesson.color}" aria-hidden="true"><span class="art-number">${lesson.number}</span>${details[lesson.id]}</div>`;
}
function home() {
  const next = lessons.find(lesson => !progress.completed.includes(lesson.id)) || lessons[0];
  return `<div class="page home-page"><section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-dot"></span> 给非程序员的 AI 入门小课</span><h1>少一点摸索，<br>多一点<span class="underline-word">上手</span>。</h1><p class="hero-description">不用懂代码，也不用背术语。<br>从一封邮件、一份纪要开始，让 AI 帮上忙。</p><div class="hero-actions"><a class="button primary" href="#/lesson/${next.id}">${progress.completed.length && progress.completed.length < 4 ? '继续我的学习' : '从第一课开始'} <span aria-hidden="true">↗</span></a><a class="text-link" href="#/?section=courses">先看看 4 节课 <span aria-hidden="true">↓</span></a></div><div class="hero-facts"><span>✓ 每节 10–15 分钟</span><span>✓ 提示词直接复制</span><span>✓ 免费 · 无需登录</span></div></div><div class="hero-visual"><img src="./assets/hero.svg" width="580" height="430" alt="原创图解：把零散便签交给 AI，说明需求，再核对邮件结果。对话界面为教学示意。"/><span class="visual-caption">不是学会一个按钮，是学会一种方法。</span></div></section>${progressMap()}<section id="courses" class="courses-section"><div class="section-heading"><div><span class="mini-label">SMALL TASKS, REAL PROGRESS</span><h2>从一件小事开始<span class="heading-dot">.</span></h2><p>四个日常场景，一步一步看，一次一次用。</p></div><span class="section-meta">4 节图解短课 <span aria-hidden="true">↙</span></span></div><div class="course-grid">${lessons.map(lesson => `<a class="course-card" href="#/lesson/${lesson.id}">${cardArt(lesson)}<div class="course-card-content"><div class="course-meta"><span>${lesson.tag}</span><span>${lesson.minutes} 分钟 · 零基础</span></div><h3>${lesson.title}<span class="card-arrow" aria-hidden="true">↗</span></h3><p>${lesson.subtitle}</p><div class="course-bottom"><span>图解步骤 / 可复制提示词 / 小练习</span><span class="course-state ${progress.completed.includes(lesson.id) ? 'is-done' : ''}">${progress.completed.includes(lesson.id) ? '✓ 已学完' : '开始这课'}</span></div></div></a>`).join('')}</div></section><section class="method-teaser"><div><span class="mini-label">A LITTLE METHOD GOES A LONG WAY</span><h2>不必会“咒语”，<br>先把这四件事说清楚。</h2><a class="text-link" href="#/toolkit">带走你的提示词模板 <span aria-hidden="true">↗</span></a></div><div class="method-four">${[['01', '给背景', '这件事为什么做'], ['02', '说任务', '希望 AI 帮你做什么'], ['03', '定格式', '结果长什么样'], ['04', '划边界', '哪些信息不能编']].map(([num, title, text]) => `<div><span>${num}</span><h3>${title}</h3><p>${text}</p></div>`).join('')}</div></section><div class="home-note"><span aria-hidden="true">✳</span><p>AI 的回答是起点。你的检查和判断，让它成为可用的成果。</p><a href="#/guide">开始前读一读 ↗</a></div></div>`;
}

const sections = [['source', '准备素材'], ['diagram', '看懂方法'], ['prompt', '试用提示词'], ['compare', '对比与改进'], ['followup', '继续追问'], ['result', '看看成品'], ['practice', '动手小练习'], ['check', '核查与隐私']];
function sectionHead(index, title, subtitle = '') { return `<div class="lesson-section-heading"><span>${String(index).padStart(2, '0')}</span><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>`; }
function diagram(lesson) {
  return `<figure class="flow-figure"><div class="flow-steps" role="img" aria-label="本课流程：${escape(lesson.diagram.join('，然后'))}">${lesson.diagram.map((text, i) => `<div class="flow-step"><span class="flow-node ${i === 1 ? lesson.color : ''}">${i === 0 ? icon(lesson.icon) : i === 1 ? '✳' : i === 2 ? icon('notes') : '✓'}</span><strong>${text}</strong><small>${['先准备', '再说明', '得到草稿', '由你把关'][i]}</small></div>${i < 3 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div><figcaption>教学流程图 · 你给素材，AI 帮忙组织，你核对结果。</figcaption></figure>`;
}
function resultBlocks(lesson) {
  return lesson.final.blocks.map(block => {
    if (block.type === 'list') return `<ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    if (block.type === 'table') return `<div class="table-scroll" tabindex="0" role="region" aria-label="待办表，可横向滚动"><table><thead><tr>${block.headers.map(text => `<th scope="col">${escape(text)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(text => `<td>${escape(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (block.type === 'metrics') return `<div class="metric-grid">${block.items.map(item => `<div><strong>${escape(item.value)}</strong><span>${escape(item.label)}</span></div>`).join('')}</div>`;
    if (block.type === 'heading') return `<h4>${escape(block.text)}</h4>`;
    if (block.type === 'meta') return `<p class="result-meta"><strong>${escape(block.label)}：</strong>${escape(block.text)}</p>`;
    if (block.type === 'callout') return `<p class="result-callout">${escape(block.text)}</p>`;
    return `<p>${escape(block.text)}</p>`;
  }).join('');
}
function quizContent(lesson) {
  const selected = progress.answers[lesson.id];
  const selectedOption = lesson.quiz.options[selected];
  return `<fieldset class="quiz"><legend>${lesson.quiz.question}</legend><p class="quiz-instruction">选出更可靠的做法，马上看看原因。</p><div class="quiz-options">${lesson.quiz.options.map((option, i) => `<label class="quiz-option ${selected === i ? option.correct ? 'correct' : 'incorrect' : ''}"><input type="radio" name="quiz-${lesson.id}" value="${i}" data-quiz="${lesson.id}" ${selected === i ? 'checked' : ''}/><span>${option.text}</span>${selected === i ? `<span class="answer-symbol" aria-hidden="true">${option.correct ? '✓' : '↻'}</span>` : ''}</label>`).join('')}</div><p class="quiz-feedback ${selectedOption?.correct ? 'success' : ''}" role="status" aria-live="polite">${selectedOption ? escape(selectedOption.feedback) : '不计分，可以反复尝试。'}</p></fieldset>`;
}
function completeButton(lesson) {
  const done = progress.completed.includes(lesson.id);
  const correct = lesson.quiz.options[progress.answers[lesson.id]]?.correct;
  return `<button class="button primary complete-button" data-complete="${lesson.id}" ${done || !correct ? 'disabled' : ''}>${done ? '✓ 这节课已学完' : correct ? '标记这节课已学完 ✓' : '先完成上面的练习'}</button>`;
}
function lessonPage(lesson) {
  const index = lessons.indexOf(lesson);
  const next = lessons[index + 1];
  return `<div class="page lesson-layout"><aside class="lesson-sidebar"><a class="back-link" href="#/">← 返回全部课程</a><span class="mini-label">你的四节上手课</span><nav aria-label="课程导航" class="lesson-nav">${lessons.map(item => `<a href="#/lesson/${item.id}" ${item.id === lesson.id ? 'aria-current="page"' : ''}><span class="lesson-nav-number">${progress.completed.includes(item.id) ? '✓' : item.number}</span>${item.shortTitle}</a>`).join('')}</nav><div class="sidebar-progress"><div><span>学习进度</span><strong>${progress.completed.length} / 4</strong></div><progress value="${progress.completed.length}" max="4" aria-label="已完成课程数"></progress><small>仅保存在当前浏览器</small></div><nav aria-label="本课目录" class="toc"><span class="mini-label">本课路线</span>${sections.map(([id, title], i) => `<a href="#/lesson/${lesson.id}?section=${id}"><span>${i + 1}</span>${title}</a>`).join('')}</nav></aside><article class="lesson-article"><div class="breadcrumb"><a href="#/">图解课程</a><span>/</span>第 ${lesson.number} 课</div><div class="lesson-title"><span class="eyebrow">${icon(lesson.icon)} ${lesson.tag} <span class="label-divider">/</span> ${lesson.minutes} 分钟 · 零基础</span><h1>${lesson.title}</h1><p>${lesson.subtitle}</p></div><div class="lesson-outcome"><span aria-hidden="true">↗</span><div><strong>学完带走什么？</strong><p>${lesson.outcome}，以及“${lesson.skill}”的方法。</p></div></div><p class="lesson-scene">${lesson.scene}</p><div class="mobile-toc"><label for="section-select">跳到本课步骤</label><select id="section-select" data-section-select="${lesson.id}"><option value="">选择步骤</option>${sections.map(([id, title], i) => `<option value="${id}">${i + 1}. ${title}</option>`).join('')}</select></div>
  <section class="lesson-section" id="source">${sectionHead(1, '先给 AI 一份好素材', '先用虚构案例练习，不必拿自己的私人资料试手。')}<div class="source-card"><div class="source-card-title"><span>${lesson.sourceTitle}</span><span class="fiction-badge">虚构素材</span></div><pre>${escape(lesson.source)}</pre>${copyButton(lesson.source, '复制原始素材', 'source-copy')}</div></section>
  <section class="lesson-section" id="diagram">${sectionHead(2, '用一张图，看懂怎么做')}${diagram(lesson)}<div class="goal-grid">${lesson.goal.map((value, i) => `<div><span>${['给背景', '说任务', '定格式', '划边界'][i]}</span><p>${value}</p></div>`).join('')}</div></section>
  <section class="lesson-section" id="prompt">${sectionHead(3, '把需求说完整，再试一次', '复制后，粘贴到你选择的文字对话 AI 工具中。网站本身不调用 AI。')}<div class="prompt-panel"><div class="prompt-toolbar"><span><span class="tiny-dot"></span> 可直接使用 · 已包含本课素材</span>${copyButton(fullPrompt(lesson), '复制完整提示词')}</div><pre>${escape(lesson.prompt)}</pre><details class="prompt-source"><summary>查看随提示词一同复制的虚构素材</summary><pre>${escape(lesson.source)}</pre></details></div><p class="small-note">先粘贴完整提示词，再阅读结果。不同工具的回答可能不同，下面的输出是人工编写的教学示例。</p></section>
  <section class="lesson-section" id="compare">${sectionHead(4, '第一稿不够好，就这样改')}<div class="comparison-controls" role="group" aria-label="切换对比视图"><button class="active" data-compare="both" aria-pressed="true">并排看</button><button data-compare="before" aria-pressed="false">看初稿</button><button data-compare="after" aria-pressed="false">看改进后</button></div><div class="comparison" data-view="both"><div class="compare-card before"><div class="compare-label"><span>第一稿</span><span>需要警惕的输出</span></div><p class="compare-output">${escape(lesson.before)}</p><ul>${lesson.beforeNotes.map(note => `<li>${note}</li>`).join('')}</ul></div><div class="compare-card after"><div class="compare-label"><span>改进后</span><span>有依据的表达</span></div><p class="compare-output">${escape(lesson.after)}</p><ul>${lesson.afterNotes.map(note => `<li>${note}</li>`).join('')}</ul></div></div><p class="comparison-takeaway"><span aria-hidden="true">✳</span>${lesson.comparisonLesson}</p></section>
  <section class="lesson-section" id="followup">${sectionHead(5, '不用重来，接着追问', '把下面的话接着发给 AI，让它在已有结果上改进。')}<div class="followup-list">${lesson.followups.map((item, i) => `<div class="followup-card"><span class="followup-index">0${i + 1}</span><div><h3>${item.title}</h3><p>${item.text}</p><small>${item.why}</small></div>${copyButton(item.text, '复制追问')}</div>`).join('')}</div></section>
  <section class="lesson-section" id="result">${sectionHead(6, '最后，让成果真正能用', '这是核对后的成品示例；换成自己的材料后，仍要重新检查。')}<div class="result-document"><div class="document-toolbar"><span>${lesson.final.eyebrow}</span>${copyButton(finalText(lesson), '复制成果')}</div><div class="document-content"><h3>${lesson.final.title}</h3>${resultBlocks(lesson)}</div></div></section>
  <section class="lesson-section" id="practice">${sectionHead(7, '用 30 秒，检查你学会了没')}<div id="quiz-container">${quizContent(lesson)}</div></section>
  <section class="lesson-section" id="check">${sectionHead(8, '用之前，最后检查一下')}<div class="check-columns"><div class="check-card"><h3><span aria-hidden="true">✓</span> 事实核查</h3><ul>${lesson.checks.map(text => `<li>${text}</li>`).join('')}</ul></div><div class="check-card privacy"><h3><span aria-hidden="true">◇</span> 隐私提醒</h3><ul>${lesson.privacy.map(text => `<li>${text}</li>`).join('')}</ul></div></div><p class="reference-note">方法参考：<a href="${sourceReference.url}" target="_blank" rel="noopener noreferrer">NIST 生成式 AI 风险概况（2024，PDF）↗</a>，§2.2 虚构内容、§2.4 数据隐私。全部案例与输出由本项目编写。</p></section><div class="lesson-finish"><div><span class="mini-label">ONE SMALL STEP, WELL DONE</span><h2>能核对，才算用得好。</h2><p>完成练习后标记学完，进度只存在当前浏览器。</p></div><div id="completion-control">${completeButton(lesson)}</div></div><div class="lesson-pagination">${index > 0 ? `<a href="#/lesson/${lessons[index - 1].id}">← 上一课：${lessons[index - 1].shortTitle}</a>` : '<a href="#/">← 全部课程</a>'}${next ? `<a href="#/lesson/${next.id}">下一课：${next.shortTitle} →</a>` : '<a href="#/toolkit">带走提示词模板 →</a>'}</div></article></div>`;
}

function toolkit() {
  return `<div class="page toolbox-page"><div class="page-heading"><span class="eyebrow">留一份，下次直接用</span><h1>你的提示词工具箱<span class="heading-dot">.</span></h1><p>把方括号里的内容换成你的任务。复制前，先删掉不该分享的私人信息。</p></div><section class="builder-section"><div class="builder-intro"><span class="mini-label">MAKE IT YOURS</span><h2>拼一张自己的任务卡</h2><p>不需要特殊术语，像给同事交代任务一样写清楚。</p><p class="small-note">此处仅拼接文字，不会向 AI 或服务器发送。输入不会保存，切换页面后清空。</p></div><div class="builder"><div class="builder-fields">${[['context', '给背景', '例如：我要为社区阅读活动准备一则通知'], ['task', '说任务', '例如：写一则邀请居民报名的短通知'], ['format', '定格式', '例如：标题 + 正文 + 报名方式，150 字左右'], ['boundary', '划边界', '例如：只用提供的信息，缺失的时间与地点标为待确认']].map(([name, label, placeholder]) => `<label for="builder-${name}"><span>${label}</span><textarea id="builder-${name}" data-builder="${name}" rows="2" maxlength="2000" placeholder="${placeholder}"></textarea></label>`).join('')}</div><div class="builder-preview"><span class="mini-label">你的任务卡</span><pre id="builder-output"></pre><button class="button primary" data-copy-builder>复制我的任务卡 <span aria-hidden="true">▣</span></button><p class="small-note">先填完四项，再复制；这不是 AI 生成结果。</p></div></div></section><section class="template-section"><div class="section-heading"><div><span class="mini-label">READY TO REUSE</span><h2>四张场景模板</h2><p>留下可复用的方法，而不只是一次的答案。</p></div><button class="button secondary" data-download>下载全部模板 ↓</button></div><div class="template-grid">${lessons.map(lesson => `<article class="template-card"><div class="template-title"><span class="template-icon ${lesson.color}">${icon(lesson.icon)}</span><div><span>模板 ${lesson.number}</span><h3>${lesson.shortTitle}</h3></div></div><pre>${escape(lesson.template)}</pre><div class="template-actions">${copyButton(lesson.template, '复制模板')}<a href="#/lesson/${lesson.id}">看完整课程 ↗</a></div></article>`).join('')}</div></section></div>`;
}
function guide() {
  return `<div class="page guide-page"><div class="page-heading"><span class="eyebrow">开始前，花两分钟</span><h1>让 AI 帮忙，<br>把判断留给自己。</h1><p>这是一套任务教程。会使用浏览器，就可以从第一课开始。</p></div><div class="guide-layout"><section class="guide-card"><span class="mini-label">01 / 如何开始</span><h2>只需要一个文字对话工具</h2><ol><li>先打开第一课，读一遍虚构素材。</li><li>点击“复制完整提示词”，粘贴到你自己选择的 AI 对话工具。</li><li>对照本课示例检查结果，再用“继续追问”改一轮。</li><li>完成小练习，标记学完。你也可以只在本站阅读和练习。</li></ol><p>课程不依赖某一家产品、某个按钮或付费功能。所选工具的访问方式、账户及使用条款请查看该工具的官方说明。本站无需登录、密钥或连接账户。</p></section><section class="guide-card"><span class="mini-label">02 / 四件事说清楚</span><h2>背景 → 任务 → 格式 → 边界</h2><p>“帮我写好一点”太宽泛。可以改成：“我是阅读活动协调员，请根据下面的便签，写一封咨询场地的邮件，给主题和约 200 字正文；语气礼貌；预约没确认，费用不能编。”</p><p>一开始不用写得完美。结果哪里不合适，就指明哪里要改，并重复不能改动的事实。</p><a class="text-link" href="#/toolkit">打开提示词工具箱 ↗</a></section><section class="guide-card"><span class="mini-label">03 / 检查结果</span><h2>写得通顺，也要找得到依据</h2><p>生成式 AI 可能给出听起来肯定、实际错误的内容。让它列依据有助于检查，但依据本身也需要你回到原文核对。问 AI“你确定吗”不能代替验证。</p><ul><li>核对姓名、时间、数字和单位。</li><li>区分事实、推断、建议和已批准的决定。</li><li>缺少依据就标注待确认；重要材料请相关负责人复核。</li></ul><p class="reference-note">参考：<a href="${sourceReference.url}" target="_blank" rel="noopener noreferrer">${sourceReference.title} ↗</a><br>${sourceReference.detail}</p></section><section class="guide-card"><span class="mini-label">04 / 本站的隐私与进度</span><h2>数据留在你的浏览器</h2><p>本站没有账户、分析统计、广告、外部字体、AI 接口或上传服务。仅使用浏览器 localStorage 保存课程完成状态与练习选项，不保存你在任务卡里输入的文字。</p><p>复制和下载都由浏览器在本地完成。点击 NIST 参考链接会打开外部网站，进入你选择的 AI 工具后则适用该工具自己的数据规则。你向所选主机请求网页时，主机仍可能保留常规访问日志。</p><p>进度不会跨设备同步。清除浏览器数据会清除进度；隐私模式或禁用存储时，进度可能无法保存。</p><div class="reset-row"><span>目前完成 <strong>${progress.completed.length} / 4</strong> 节课</span><button class="button secondary" data-reset>清除本地学习进度</button></div></section><section class="guide-card full-width"><span class="mini-label">关于这套课</span><h2>学会一件小事，比记住一百条提示词更有用。</h2><p>所有活动、角色、数据和输出均为本项目原创的虚构教学内容，不是现实活动或研究结论。所有图解采用可维护的 SVG / CSS；示意对话明确标注为教学示意，没有冒充任何产品截图。</p><p>项目代码与教材使用 MIT 许可证，适合自行学习、改编和参与共建。扩展课程的方法与运行说明见仓库中文 README 及 docs/content-guide.md。</p><a class="button primary" href="#/lesson/email">开始第一课 ↗</a></section></div></div>`;
}
function route() {
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  if (path !== currentPath) {
    copies.clear();
    currentPath = path;
    const lesson = path.startsWith('/lesson/') ? lessons.find(item => path === `/lesson/${item.id}`) : undefined;
    const page = lesson ? 'lesson' : path === '/toolkit' ? 'toolkit' : path === '/guide' ? 'guide' : path === '/' ? 'home' : 'missing';
    main.innerHTML = lesson ? lessonPage(lesson) : page === 'home' ? home() : page === 'toolkit' ? toolkit() : page === 'guide' ? guide() : '<div class="page not-found"><span class="eyebrow">这条小路还没修好</span><h1>没有找到这节课</h1><p>课程地址可能不完整，先回到上手地图继续吧。</p><a class="button primary" href="#/">返回课程首页 →</a></div>';
    document.title = `${lesson ? lesson.title : page === 'toolkit' ? '提示词工具箱' : page === 'guide' ? '开始前读一读' : page === 'missing' ? '页面未找到' : '从一件小事开始'} · AI 上手课`;
    document.querySelectorAll('[data-nav]').forEach(link => {
      const active = link.dataset.nav === (page === 'lesson' ? 'home' : page);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (page === 'toolkit') updateBuilder();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (hasRendered) main.focus({ preventScroll: true });
    hasRendered = true;
    if (page === 'lesson' && !storageAvailable) main.querySelector('.lesson-title').insertAdjacentHTML('afterend', '<p class="storage-warning">此浏览器无法保存进度。你仍可继续学习，本次进度暂留在页面中，刷新后可能丢失。</p>');
  }
  const section = params.get('section');
  if (section) {
    const target = document.getElementById(section);
    if (target && main.contains(target)) { target.scrollIntoView({ behavior: 'instant', block: 'start' }); }
    const select = document.querySelector('#section-select');
    if (select) select.value = section;
  }
}
function updateBuilder() {
  const fields = [...document.querySelectorAll('[data-builder]')];
  const labels = ['背景', '任务', '格式', '边界'];
  document.querySelector('#builder-output').textContent = fields.map((field, i) => `${labels[i]}：${field.value.trim() || `[请填写${labels[i]}]`}`).join('\n\n');
}
async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
  } catch { /* 非安全上下文或权限受限时使用本地选择复制 */ }
  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = value; textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.append(textarea); textarea.select();
  let success = false;
  try { success = document.execCommand('copy'); } catch { /* 提供手动复制 */ }
  textarea.remove(); previousFocus?.focus({ preventScroll: true });
  if (!success) {
    const dialog = document.createElement('dialog');
    dialog.className = 'copy-dialog';
    dialog.innerHTML = '<h2>请手动复制</h2><p>自动复制未成功。请全选下面的内容后复制；手机上可长按选择。</p><textarea aria-label="待复制内容" rows="12" readonly></textarea><form method="dialog"><button class="button primary">关闭</button></form>';
    dialog.querySelector('textarea').value = value;
    document.body.append(dialog); dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal(); dialog.querySelector('textarea').select();
  }
  return success;
}
async function handleCopy(button, value) {
  if (!value) return;
  const success = await copyText(value);
  if (!success || !button.isConnected) return;
  if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
  clearTimeout(copyTimers.get(button));
  button.innerHTML = '<span aria-hidden="true">✓</span> 已复制';
  button.classList.add('copied');
  toast('已复制，可以粘贴到你选择的 AI 工具中。');
  copyTimers.set(button, setTimeout(() => { button.innerHTML = button.dataset.originalLabel; button.classList.remove('copied'); }, 2000));
}
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault(); main.focus({ preventScroll: true }); main.scrollIntoView({ block: 'start' }); return;
  }
  const button = event.target.closest('button');
  if (button?.dataset.copy) await handleCopy(button, copies.get(button.dataset.copy));
  if (button?.hasAttribute('data-copy-builder')) {
    const fields = [...document.querySelectorAll('[data-builder]')];
    const emptyField = fields.find(field => !field.value.trim());
    if (emptyField) { toast('先把四项需求填完整，再复制任务卡。'); emptyField.focus(); return; }
    await handleCopy(button, document.querySelector('#builder-output').textContent);
  }
  if (button?.dataset.compare) {
    document.querySelector('.comparison').dataset.view = button.dataset.compare;
    document.querySelectorAll('[data-compare]').forEach(item => {
      const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
    });
  }
  if (button?.dataset.complete) {
    const id = button.dataset.complete;
    const lesson = lessons.find(item => item.id === id);
    if (lesson?.quiz.options[progress.answers[id]]?.correct && !progress.completed.includes(id)) {
      progress.completed.push(id); persist();
      const savedScroll = window.scrollY;
      currentPath = ''; route(); window.scrollTo(0, savedScroll);
      toast(`学完第 ${lesson.number} 课！进度 ${progress.completed.length} / 4。`);
      document.querySelector('.complete-button')?.focus({ preventScroll: true });
    }
  }
  if (button?.hasAttribute('data-download')) {
    const text = ['AI 上手课 · 可复用提示词模板', '全部案例为原创虚构教学内容。使用前请脱敏，使用后核对事实。MIT License。', ...lessons.map(lesson => `${lesson.number} ${lesson.shortTitle}\n\n${lesson.template}`)].join('\n\n────────────\n\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'AI上手课-四张提示词模板.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('四张模板已打包为 TXT 文件。');
  }
  if (button?.hasAttribute('data-reset')) {
    const dialog = document.createElement('dialog'); dialog.className = 'reset-dialog';
    dialog.innerHTML = '<h2>清除本地学习进度？</h2><p>将清除当前浏览器里的课程完成状态和练习选项。课程内容仍可继续阅读。</p><div class="dialog-actions"><button class="button secondary" data-cancel-reset>保留进度</button><button class="button primary" data-confirm-reset>确认清除</button></div>';
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('[data-cancel-reset]').focus();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('[data-cancel-reset]').onclick = () => dialog.close();
    dialog.querySelector('[data-confirm-reset]').onclick = () => {
      progress = { version: 1, completed: [], answers: {} }; persist(); dialog.close(); currentPath = ''; route(); toast('本地学习进度已清除。');
    };
  }
  const link = event.target.closest('a[href^="#/"]');
  if (link && link.hash === location.hash) {
    event.preventDefault();
    if (location.hash.includes('?section=')) route(); else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.quiz) {
    const lesson = lessons.find(item => item.id === input.dataset.quiz);
    const index = Number(input.value);
    if (!lesson || !lesson.quiz.options[index]) return;
    progress.answers[lesson.id] = index;
    persist();
    document.querySelector('#quiz-container').innerHTML = quizContent(lesson);
    document.querySelector('#completion-control').innerHTML = completeButton(lesson);
    document.querySelector(`input[name="quiz-${lesson.id}"][value="${index}"]`)?.focus({ preventScroll: true });
  }
  if (input.dataset.sectionSelect && input.value) location.hash = `/lesson/${input.dataset.sectionSelect}?section=${input.value}`;
});
document.addEventListener('input', event => { if (event.target.dataset.builder) updateBuilder(); });
window.addEventListener('hashchange', route);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    const loaded = loadProgress(storage); progress = loaded.data; storageAvailable = loaded.available;
    const savedScroll = window.scrollY; currentPath = ''; route(); window.scrollTo(0, savedScroll);
  }
});
route();
