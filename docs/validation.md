# 初版验证记录

验证日期：2026-10-23 UTC。代码与构建均位于云端 `/workspace/tech-for-good`。原始仓库只有 `# tech-for-good` 的 README；保留该标题并补充中文说明。没有发现仓库 AGENTS.md 或 `.agents/skills` 下的本地技能文件。

## 环境与结果

| 项目 | 结果 |
| --- | --- |
| Node.js / npm | 24.19.0 / 11.9.0 |
| `npm test` | 5 项通过，0 失败 |
| `npm run build` | 通过，生成纯静态 `dist/` 及 4 份 TXT 模板 |
| JS 语法检查 | `app.js`、`content.js`、`state.js`、服务与浏览器脚本通过 |
| `git diff --check` | 通过 |
| 浏览器 | 环境现有 Chromium 154.0.8037.57，Playwright 1.57.0 |
| `npm run test:browser` | 11 组检查通过 |
| 测试期间的自动外部请求 | 0 |
| 测试捕获的页面 JS 异常 | 0 |
| 开发服务器隐藏路径 | `.git/config` 与 `README.md` 返回 404；`templates/email.txt` 返回 200 |

本次未安装 npm 依赖，复用了云端已有的 Playwright 与 Chromium。浏览器检查使用构建产物，命令为：

```bash
npm start
# 在另一个终端中：
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs \
BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

## 11 组浏览器检查

1. 桌面首页、四节课程入口、键盘跳至主内容。
2. 四课深链接、每课八段内容、课内目录、初稿 / 改进后 / 并排视图、刷新锚点。
3. 完整提示词确实包含素材；追问和成果复制正确；连续点击反馈正常。
4. 错误选项解释、答对后标记学完、重复操作不会增加计数、刷新恢复；复习答错不抹去已完成状态。
5. 任务卡空值引导、文字拼接、特殊字符作为纯文本处理、输入不保存；模板复制和 TXT 下载。
6. 本地进度清除操作可以取消或确认。
7. 360、390、768 像素宽度下，首页、四课、工具箱与说明页均无整页横向溢出；手机步骤导航可用。桌面验证宽度 1440 像素。
8. 模拟剪贴板权限失败及旧复制接口失败，展示完整可选中文本；关闭按钮和 Escape 都能退出。
9. 禁用浏览器存储或写入损坏数据后，仍可阅读、练习和在当前页面标记完成。
10. 未知路由可回首页；同链接重复点击与浏览器后退正常。
11. 测试期间应用没有页面 JS 异常，也没有自动外部请求。

验证过程中修正了：首次载入不应抢走键盘导航焦点；跳至主内容不应触发错误路由；固定页头与锚点偏移不应叠加过多留白。提高了教学正文、提示词与手机按钮的可读性和触控尺寸。最终桌面与手机截图已人工检查。

## 证据与获取方式

运行浏览器检查会在 `artifacts/` 生成：

- `browser-results.json`：机器可读结果，含浏览器版本、时间、各组状态。
- `home-desktop.png` / `home-mobile.png`：桌面和手机首页。
- `lesson-desktop.png` / `lesson-mobile.png`：完整邮件课程。
- `lesson-mobile-compare.png`：手机对比视图。
- `report-desktop.png`：一页汇报成品示例。
- `toolkit-desktop.png`：提示词工具箱。
- `downloaded-templates.txt`：实际下载的四张模板。

`artifacts/` 和 `dist/` 不写入 Git。交付压缩包 `/workspace/ai-shangshouke-delivery.zip` 包含源码、文档、构建产物和上述验证证据，解压后可按 README 运行。没有创建可对外访问的云端预览 URL；测试使用的 `127.0.0.1:4173` 只是环境本机地址。验证结束后停止了临时预览服务。

## 限制与后续

- 手机验证是 Chromium 的视口模拟，未实测 iOS Safari、Firefox、真实触控设备或屏幕阅读器，也不声称通过完整无障碍审计。
- 没有调用真实 AI 工具验证输出；课程成品是人工编写的教学示例，实际结果需要读者自己核查。
- 当前初版固定四课；扩展总课数时需同步调整首页、进度文案和测试，详见内容扩展指南。
- 没有发布网站、公开仓库、推送远程、创建 PR、开通付费服务或修改用户电脑。没有已知阻塞。
- 建议下一步邀请少量零基础读者按步骤试学，依据卡点改进内容；远程推送与公开发布需另行安排。

## 后续授权后的 Pages 兼容性补验

初版验证完成后，用户于 2026-10-23 11:44 UTC 明确授权将此项目公开并发布 GitHub Pages。发布操作记录应与上面的初版本地开发记录区分。

- 以 `/tech-for-good/` 为静态根路径重新执行了同一套 11 组浏览器检查，全部通过；机器结果位于 `artifacts/pages-subpath/browser-results.json`。
- 首页及四课、静态资源、深链接刷新、手机布局、剪贴板回退、练习和模板下载均适配项目子路径，没有额外改写应用代码。
- 新增 `.github/workflows/pages.yml`，测试后构建 `dist/` 并上传到 Pages；不添加长期凭证。
- 对拟发布的源码、文档、SVG 与配置进行了敏感模式检查，未发现密钥、私人邮箱、手机号或带凭证 URL。案例均为原创虚构教学内容。
- 曾尝试验证自包含离线 HTML，但云端 Chromium 对 `file:///workspace/tech-for-good/dist/offline.html` 导航返回 `ERR_BLOCKED_BY_ADMINISTRATOR`。未调整策略或重试该操作，离线试验已撤回，不将未经完整验证的双击版纳入交付；仍按 README 用 HTTP 服务启动。
- 环境中 `gh api repos/spider-man-peter-park/tech-for-good` 返回 `Forbidden`；已连接 GitHub 工具可读仓库且显示管理员权限，但不提供可见性和 Pages 设置动作。后续这些设置是否执行成功，需以实际工具返回状态为准，不能用本地兼容性结果替代。

## 2026-10-24 · 中英文切换

新增页头中文 / English 控件、完整四课英文教材与英文 SVG、界面成对词条、英文模板导出和语言偏好。默认中文，链接 `?lang=en` 或 `?lang=zh` 优先于已保存偏好。没有改变旧进度的数据格式或课程 ID；中英文共用完成状态及练习答案。

本次结果：`npm test` 10 项通过，`npm run build` 通过。英文与中文各自运行同一套 11 组浏览器检查，另有 7 组语言切换检查，均通过。最终完整回归在模拟 Pages 的 `/tech-for-good/` 子路径上进行；覆盖 1440 像素桌面与 360 / 390 / 768 像素布局。Chromium 154.0.8037.57，测试使用现有 Playwright 1.57.0，没有新增运行依赖。

新增检查包括：

1. 所有页面、标题、元描述、HTML `lang`、图解和无障碍标签随语言切换，英文正文没有中文残留。
2. 重复点击语言按钮不会重复渲染，焦点留在所选按钮；刷新恢复语言。
3. 切换保留当前课程与步骤、旧版完成进度、练习答案、展开的素材和对比视图。
4. 任务卡保留用户输入，复制和 TXT 模板下载使用当前语言；不把输入写入存储。
5. 显式链接、偏好和默认语言的优先级正确；未知或异常参数安全回退。
6. 浏览器前进后退按照历史链接的语言展示，不改写最后主动选择的偏好。
7. 清除进度保留语言；存储和剪贴板均禁用时，仍可用 URL 切换语言并手动复制完整英文内容。

最终机器证据分别为 `artifacts/bilingual-pages-zh/browser-results.json`、`artifacts/bilingual-pages-en/browser-results.json` 和 `artifacts/bilingual-pages-switch/browser-i18n-results.json`，共 29 组通过；捕获的页面 JS 异常为 0，两种语言各自测试的自动外部请求均为 0。桌面和手机英文截图已经人工检查。构建包含中文 `templates/*.txt` 及英文 `templates/en/*.txt`，原中文链接保持有效。

仓库查询当前返回 `public`。对实际 Pages 域名的读取在此环境被网络代理以 HTTP 403 阻止，因此此处只确认本地构建及 Pages 子路径测试，不把外网部署状态说成已验证。未尝试绕过代理限制；语言更新沿用现有 Pages 工作流。
