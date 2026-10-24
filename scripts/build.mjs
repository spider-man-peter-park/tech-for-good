import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { lessons } from '../src/content.js';
import { lessonsEn } from '../src/content-en.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'src', 'assets']) await cp(join(root, file), join(dist, file), { recursive: true });
await mkdir(join(dist, 'templates'), { recursive: true });
for (const lesson of lessons) await writeFile(join(dist, 'templates', `${lesson.id}.txt`), `${lesson.title}\n\n${lesson.template}\n\nAI 上手课 · 原创虚构教学内容 · MIT License\n`);
await mkdir(join(dist, 'templates', 'en'), { recursive: true });
for (const lesson of lessonsEn) await writeFile(join(dist, 'templates', 'en', `${lesson.id}.txt`), `${lesson.title}\n\n${lesson.template}\n\nAI Starter Class · Original fictional teaching material · MIT License\n`);
console.log('构建完成：dist/（纯静态文件，支持子目录部署，无运行时依赖）');
