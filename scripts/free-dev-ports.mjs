/**
 * Frees ports 3000 and 4000 before starting dev servers (avoids EADDRINUSE / stale Next.js).
 */
import { execSync } from 'child_process';

const ports = [3000, 4000];
const isWin = process.platform === 'win32';

function freePortWin(port) {
  try {
    const out = execSync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Killed PID ${pid} on port ${port}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* port not in use */
  }
}

function freePortUnix(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      shell: true,
      stdio: 'ignore',
    });
    console.log(`Freed port ${port} (if it was in use)`);
  } catch {
    /* ignore */
  }
}

for (const port of ports) {
  if (isWin) freePortWin(port);
  else freePortUnix(port);
}
