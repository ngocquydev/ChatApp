import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appConfig = {
  backend: {
    dir: 'apps/server',
    tasks: ['lint', 'typecheck', 'test:security', 'test:memory', 'test:nplusone', 'test', 'build'],
  },
  server: {
    dir: 'apps/server',
    tasks: ['lint', 'typecheck', 'test:security', 'test:memory', 'test:nplusone', 'test', 'build'],
  },
  frontend: {
    dir: 'apps/web',
    tasks: ['lint', 'typecheck', 'build'],
  },
  web: {
    dir: 'apps/web',
    tasks: ['lint', 'typecheck', 'build'],
  },
  admin: {
    dir: 'apps/admin',
    tasks: ['lint', 'typecheck'],
  },
};

const appName = process.argv[2];
const selectedApp = appConfig[appName];
if (!selectedApp) {
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

const appDirectory = path.join(repositoryRoot, selectedApp.dir);
run(npmCommand, ['ci', '--legacy-peer-deps'], appDirectory);

if (appName === 'backend' || appName === 'server') {
  run(process.execPath, ['.github/scripts/ci-inspect.mjs'], repositoryRoot);
}

for (const task of selectedApp.tasks) {
  run(npmCommand, ['run', task], appDirectory);
}
