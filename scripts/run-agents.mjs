/**
 * Start NutriMind Python agents (uvicorn). Tries Windows `py` launcher, then python3/python.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const agentsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'agents');
const uvicornArgs = ['-m', 'uvicorn', 'server:app', '--reload', '--host', '127.0.0.1', '--port', '8001'];

const candidates = process.platform === 'win32' ? ['py', 'python3', 'python'] : ['python3', 'python'];

function trySpawn(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, uvicornArgs, {
      cwd: agentsDir,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', () => resolve(false));
    child.on('spawn', () => {
      console.log(`\nNutriMind agents running (${cmd}) → http://127.0.0.1:8001\n`);
      resolve(true);
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  });
}

(async () => {
  for (const cmd of candidates) {
    const ok = await trySpawn(cmd);
    if (ok) return;
  }
  console.error(`
Python not found. Use npm run dev — API + web work without agents (meal plan fallback built in).

Windows: you likely have the "py" launcher — run: py --version
If that works: npm run dev:agents:install && npm run dev:agents

Or install Python 3.11–3.12 from https://www.python.org/downloads/ (check "Add to PATH").
`);
  process.exit(1);
})();
