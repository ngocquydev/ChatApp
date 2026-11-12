import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appTasks = {
  backend: ['lint', 'typecheck', 'test:security', 'test:memory', 'test:nplusone', 'test', 'build'],
  frontend: ['lint', 'typecheck', 'build'],
  admin: ['lint', 'typecheck'],
};

const appName = process.argv[2];
const tasks = appTasks[appName];
if (!tasks) {
  throw new Error(`Unknown app for Vercel CI: ${appName || '(missing)'}`);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const appDirectory = path.join(repositoryRoot, appName);
run(npmCommand, ['ci', '--legacy-peer-deps'], appDirectory);

if (appName === 'backend') {
  run(process.execPath, ['scripts/ci-inspect.mjs'], repositoryRoot);
}

for (const task of tasks) {
  run(npmCommand, ['run', task], appDirectory);
}
