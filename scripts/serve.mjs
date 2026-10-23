import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)), process.argv.includes('--dist') ? 'dist' : '.');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.') && part !== '')) throw new Error('hidden');
    const path = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!path.startsWith(root + sep)) throw new Error('path');
    // 开发服务器只暴露前端文件；不会暴露文档、Git、测试或环境文件。
    const relative = path.slice(root.length + 1);
    if (!(relative === 'index.html' || relative === 'styles.css' || /^(assets|src|templates)\//.test(relative))) throw new Error('not-public');
    if (!(await stat(path)).isFile()) throw new Error('not-file');
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 · 未找到文件'); }
});
server.listen(port, host, () => console.log(`AI 上手课 ${process.argv.includes('--dist') ? '构建预览' : '开发服务'}：http://${host}:${port}\n此地址仅为服务器本机地址；云端访问需要环境提供的端口转发。`));
server.on('error', error => { console.error(`服务启动失败：${error.message}`); process.exitCode = 1; });
