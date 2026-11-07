// capture_live_frontend.js - Native CDP Screenshot Capturer using Node.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\htc12\\.gemini\\antigravity\\brain\\6d1e9aab-449f-49a5-8941-bc37b0ded2a3';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log('[1/6] Authenticating via Spring Boot backend to obtain real JWT token...');
  const authRes = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'trader@gmail.com', password: 'Password123456!' })
  });
  const authData = await authRes.json();
  const token = authData.token;
  console.log('Got real JWT token (length:', token?.length || 0, ')');

  console.log('[2/6] Launching Chrome in headless CDP mode...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1600,1000',
    '--user-data-dir=C:\\Users\\htc12\\AppData\\Local\\Temp\\chrome_cdp_profile_3'
  ]);

  await sleep(3000);

  console.log('[3/6] Fetching CDP targets...');
  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const listData = await listRes.json();
  const target = listData.find(t => t.type === 'page') || listData[0];
  const pageWsUrl = target.webSocketDebuggerUrl;

  const ws = new WebSocket(pageWsUrl);
  await new Promise(res => ws.addEventListener('open', res));
  console.log('Connected to Page CDP!');

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');

  // Navigate to initial page
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/lobby' });
  await sleep(2000);

  // Inject real credentials into localStorage
  console.log('[4/6] Injecting real JWT token into localStorage...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${token}');
      localStorage.setItem('jwtToken', '${token}');
      localStorage.setItem('user_email', 'trader@gmail.com');
      localStorage.setItem('user_role', 'ROLE_TRADER');
      localStorage.setItem('user_fullname', 'Master Trader');
      localStorage.setItem('user', JSON.stringify({
        id: 3,
        email: 'trader@gmail.com',
        role: 'ROLE_TRADER',
        fullName: 'Master Trader',
        eloRating: 1250,
        tier: 'Silver'
      }));
    `
  });

  // Capture 1: Lobby Arenas
  console.log('[5/6] Capturing 01_lobby_arenas.png...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/lobby' });
  await sleep(3500);
  let shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '01_lobby_arenas.png'), Buffer.from(shot.data, 'base64'));

  // Capture 2: Lobby Academy Tab
  console.log('[5/6] Capturing 02_lobby_academy.png...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const acadBtn = btns.find(b => b.textContent.includes('Académie'));
      if (acadBtn) acadBtn.click();
    `
  });
  await sleep(2500);
  shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '02_lobby_academy.png'), Buffer.from(shot.data, 'base64'));

  // Capture 3: Terminal Pro
  console.log('[5/6] Capturing 03_terminal_pro.png...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(5000);
  shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '03_terminal_pro.png'), Buffer.from(shot.data, 'base64'));

  // Capture 4: Arena Trading Floor
  console.log('[5/6] Capturing 04_arena_trading.png...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:3000/arena/00000000-0000-0000-0000-000000000001' });
  await sleep(5000);
  shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '04_arena_trading.png'), Buffer.from(shot.data, 'base64'));

  // Capture 5: Arena 3D Floor
  console.log('[5/6] Capturing 05_arena_3d_floor.png...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const floorBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3D Floor'));
      if (floorBtn) floorBtn.click();
    `
  });
  await sleep(3500);
  shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '05_arena_3d_floor.png'), Buffer.from(shot.data, 'base64'));

  // Capture 6: Arena FinGPT Desk
  console.log('[5/6] Capturing 06_arena_fingpt.png...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const copilotBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('FinGPT'));
      if (copilotBtn) copilotBtn.click();
    `
  });
  await sleep(2500);
  shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, '06_arena_fingpt.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  chromeProc.kill();
  console.log('[6/6] All captures finished successfully!');
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
