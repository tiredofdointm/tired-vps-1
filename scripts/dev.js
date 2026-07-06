import { spawn } from 'node:child_process';

const procs = [
  spawn('node', ['server/index.js'], { stdio: 'inherit', env: { ...process.env, PORT: process.env.PORT || '8787' } }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
];
const stop = () => procs.forEach((p) => p.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { stop(); process.exit(code ?? 0); });
