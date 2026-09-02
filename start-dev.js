import { spawn } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  console.log('====================================================');
  console.log('  CertifyMetric — SIH26036 Legal Metrology Platform');
  console.log('====================================================\n');

  const backendRunning = await isPortInUse(4000);
  if (backendRunning) {
    console.log('✔ Backend API server is active on http://localhost:4000');
  } else {
    console.log('▶ Starting Backend API server on http://localhost:4000...');
    const serverProc = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, 'server'),
      stdio: 'inherit',
      shell: true
    });
    serverProc.on('error', (err) => console.error('Backend error:', err));
  }

  const frontendRunning = await isPortInUse(5173);
  if (frontendRunning) {
    console.log('✔ Frontend application is active on http://localhost:5173');
  } else {
    console.log('▶ Starting Frontend client on http://localhost:5173...');
    const clientProc = spawn(npmCmd, ['run', 'dev'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      shell: true
    });
    clientProc.on('error', (err) => console.error('Frontend error:', err));
  }

  console.log('\n----------------------------------------------------');
  console.log('  Open in Browser: http://localhost:5173');
  console.log('  Backend API:     http://localhost:4000');
  console.log('----------------------------------------------------\n');
}

start();
