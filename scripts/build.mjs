import { spawn } from 'node:child_process';

// The caller runs Vite exactly once. Production uses the committed CV PDFs.
if (process.env.RAILWAY_ENVIRONMENT_ID || process.env.SKIP_CV_GENERATION === '1') process.exit(0);
const command = ['npm', ['run', 'generate:cv']];

const child = spawn(command[0], command[1], { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('close', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
