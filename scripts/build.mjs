import { spawn } from 'node:child_process';

const command = process.env.RAILWAY_ENVIRONMENT_ID
  ? ['vite', ['build']]
  : ['npm', ['run', 'generate:cv']];

const child = spawn(command[0], command[1], { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('close', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
