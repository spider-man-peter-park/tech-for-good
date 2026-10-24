# tech-for-good

## AI 上手课

**面向会用浏览器、不会编程的人的中英文 AI 图解短课。** 从一封邮件、一份纪要开始，学会给素材、说需求、追问改进和核对结果。无需登录、API 密钥或后端 AI 服务。

这是可运行的项目初版。教材、SVG / CSS 图解、提示词和输出示例均为本项目原创。所有案例、角色、活动和数据为虚构，不使用个人或公司信息；对话图明确标为教学示意，不是产品截图。代码与教材统一使用 [MIT 许可证](LICENSE)。

### 四节完整短课

| 课程 | 预计时间 | 可带走的成果 | 核心判断 |
| --- | --- | --- | --- |
| 写一封得体的邮件 | 10 分钟 | 场地咨询邮件 | 未确认不能写成已预约 |
| 整理一份会议纪要 | 12 分钟 | 含负责人、期限和依据的待办表 | 建议不等于决定 |
| 读懂一篇长文章 | 12 分钟 | 带原文段落依据的阅读卡片 | 人次、样本、成本与因果不能混淆 |
| 做一页清楚的汇报 | 15 分钟 | 可粘贴到文档或幻灯片的汇报内容 | 数字保留分母，建议保留状态 |

每课包含八步：虚构原始素材 → 核心图解 → 完整提示词 → 初稿与改进对比 → 三种追问 → 最终成果 → 即时反馈小练习 → 事实核查与隐私提醒。示例输出为人工编写；在实际 AI 工具中得到的回答会不同。

### 中文 / English

页头的 **中文 / English** 按钮可随时切换。两种语言均包含完整的四节课程、虚构素材、图解、提示词、追问、成品、练习、核查和隐私说明；英文提示词明确要求英文输出，并保留原案例的事实、人民币金额和不确定性。

- 默认显示中文；选择语言后在当前浏览器保存偏好。优先级为链接中的有效 `lang` 参数 → 保存的偏好 → 中文。
- 分享英文课程可使用 `?lang=en#/lesson/email`；中文使用 `?lang=zh#/lesson/email`。参数放在 `#` 前，部署在 `/tech-for-good/` 子路径时同样适用。
- 切换时保留当前课程、步骤、练习答案、完成进度、对比视图和已经输入的任务卡文字。刷新或前进后退也会识别链接语言。两种语言共用原有进度，不用重复学完。
- 复制、提示词模板和 TXT 下载跟随当前语言。构建输出保留原有 `templates/*.txt` 中文文件，并新增 `templates/en/*.txt` 英文文件。
- 浏览器禁用存储时仍可切换，URL 保留语言，复制不可用时提供手动复制。清除学习进度保留语言选择；任务卡文字不写入存储。

**English quick start:** Use **English** in the header, or open `?lang=en#/`. All four lessons, source materials, prompts, examples, practice and downloads are available in English. Both languages share learning progress. To run locally with Node.js 20+, use `npm run dev`; no dependency installation or API key is required.

### 如何运行

需要 **Node.js 20 或以上版本**；本次验证使用 Node.js 24。项目没有 npm 依赖，**不需要 `npm install`**。

```bash
cd tech-for-good
npm run dev
```

在服务所在机器的浏览器访问终端打印的地址，默认 `http://127.0.0.1:4173`。这是本机地址。云端工作区需要平台支持的端口转发才能从自己的浏览器访问；本项目没有自动建立公网隧道或托管。

如平台已提供端口预览，可按平台要求绑定：

```bash
HOST=0.0.0.0 npm run dev -- --port 4173
```

不要直接双击 `index.html`：项目使用 ES Modules，需要通过 HTTP 服务访问。

### 构建与预览

```bash
npm run build
npm start
```

`dist/` 是完整静态站点，包含 HTML、CSS、JS、SVG 与中英文各四份 TXT 模板。`npm start` 只服务 `dist/`。开发服务器只暴露前端目录，不暴露 Git、环境文件、测试或文档。

站内使用 hash 路由：`#/lesson/email`、`#/lesson/meeting`、`#/lesson/reading`、`#/lesson/report`、`#/toolkit`、`#/guide`。静态托管不需要服务端路由回退，资源使用相对路径，支持部署在子目录。已在 `/tech-for-good/` 子路径运行全部 11 组浏览器检查，资源、四课路由、刷新、复制、模板下载及手机布局均通过。

### GitHub Pages

仓库包含 `.github/workflows/pages.yml`。它在 `main` 更新或手动运行时，使用 Node.js 24 执行内容测试和静态构建，仅把 `dist/` 上传到 Pages。发布任务只使用 GitHub 自带的短期 `GITHUB_TOKEN`，不需要添加密钥或付费服务。维护者需在仓库 Settings → Pages 中选择 GitHub Actions，并确保账户和仓库满足 Pages 使用条件；工作流不会自行改变仓库可见性或开通服务。

本地路径模拟不能证明 GitHub 端已经发布。实际是否上线应以 Actions 的部署结果及返回网址为准。无独立后端、绝对根路径或服务端重写依赖，当前应用不需要额外的 Pages 子路径代码适配。

### 已实现的交互

- 课程导航、课内目录、手机步骤选择与深链接；支持刷新和浏览器前进后退。
- 复制完整提示词（自动带入虚构素材）、原始素材、追问、成品与通用模板；连续点击有反馈。受限浏览器先尝试本地复制，再提供可选择的手动复制文本。
- 初稿 / 改进后 / 并排三种对比视图，手机自动纵向排布。
- 每课一道有解释的轻量练习；答对后可标记学完，完成操作可重复而不会累加。
- 当前浏览器本地进度与练习选项，支持刷新恢复、跨标签页更新、取消或确认清除。存储被禁用时仍可学习。
- 提示词任务卡拼接器与全部模板的 TXT 下载。任务卡只是本地拼接文字，不调用 AI，输入不持久保存。
- 键盘跳转主要内容、焦点样式、语义表单、状态播报、减少动态效果与打印样式。

### 检查与浏览器验证

内容及进度逻辑使用 Node 内置测试，无需安装依赖：

```bash
npm test
npm run build
```

浏览器测试是可选的开发验证，需要 Playwright 与 Chromium。测试脚本不会自行安装或启动服务。先在一个终端运行 `npm start`，再在另一个终端运行：

```bash
# 可选测试依赖；不影响站点运行
npm install --no-save --package-lock=false playwright@1.57.0
npx playwright install chromium
npm run test:browser
```

默认测试中文；英文和来回切换另运行：

```bash
TEST_LOCALE=en npm run test:browser
npm run test:browser:i18n
```

如环境已有模块和浏览器，可直接复用，避免安装：

```bash
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
BROWSER_EXECUTABLE=/path/to/chromium \
npm run test:browser
```

可用 `TEST_URL` 指向测试服务；默认是 `http://127.0.0.1:4173/`，末尾保留 `/`。结果与截图输出至被 Git 忽略的 `artifacts/`。覆盖四课深链接、桌面与 360/390/768 像素布局、复制反馈与回退、练习和进度、刷新、重复点击、下载、文本安全处理、存储禁用与损坏数据等。具体本次验证结论见 [docs/validation.md](docs/validation.md)。

### 内容与目录

```text
index.html                页面入口、全站导航
styles.css                响应式视觉与打印样式
assets/                   原创 SVG 图解与图标
src/content.js            四课完整内容与模板（主要编辑入口）
src/content-en.js         对应的四课完整英文教材
src/i18n.js               成对的界面词条、语言解析与偏好
src/app.js                页面渲染、导航、复制与练习交互
src/state.js              本地进度校验、读写及故障处理
scripts/build.mjs         零依赖静态构建与 TXT 模板导出
scripts/serve.mjs         本地开发 / 构建预览服务
tests/                    内容、存储与浏览器验证
docs/content-guide.md     扩展课程与编辑规则
docs/validation.md        本次验证记录和限制
CONTRIBUTING.md           共建说明
```

新增课程的字段、图解与编辑检查见 [内容扩展指南](docs/content-guide.md)。目前交互地图和部分文案按四课设计；扩展时要一起更新总数，不能只追加数据。

### 隐私、来源与边界

本站没有分析统计、广告、外部字体、AI 接口或上传功能。在 `localStorage` 的 `ai-starter-class.progress.v1` 键保存课程 ID、已完成状态和练习选项，在 `ai-starter-class.locale.v1` 键保存语言偏好 `zh` 或 `en`。不保存任务卡输入；没有跨设备同步。主机可能保留常规 HTTP 访问日志；点击外部参考链接或到其他 AI 工具使用提示词后，适用对方的数据规则。

核查及隐私方法参考 [NIST AI 600-1（2024 年 7 月）](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) 的 §2.2 Confabulation、§2.4 Data Privacy，已于 2026-10-23 核对。课程中的“背景 / 任务 / 格式 / 边界”是本项目的教学组织方式，不是产品官方标准，也不保证任何工具会完全遵循提示词。

本版不包含实际 AI 对话、不发送邮件、不录制会议、不生成 PPT 文件，也不把学习进度或输入材料上传到服务器。希望先把四件小事教完整，再按真实学习反馈扩展。
