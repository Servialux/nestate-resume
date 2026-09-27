// Isolated disposable data: browser tests never use the owner's database or LinkedIn token.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'nestate-browser-'));
process.env.DATA_DIR = directory;
delete process.env.DATA_ENCRYPTION_KEY;
const { createAdmin } = await import('../src/lib/server/auth.ts');
const { getDb } = await import('../src/lib/server/db.ts');
await createAdmin('auteur@example.test', 'Test-browser-only-2026!');
getDb().close();
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  stdio: 'inherit', env: { ...process.env, SITE_URL: '', ORIGIN: 'http://127.0.0.1:4175' }
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => { rmSync(directory, { recursive: true, force: true }); process.exit(code ?? 0); });
