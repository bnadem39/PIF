const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function postJson(path, payload, token) {
  const body = JSON.stringify(payload);
  return request({
    hostname: 'localhost',
    port: 8080,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, body);
}

function getJson(path, token) {
  return request({
    hostname: 'localhost',
    port: 8080,
    path: path,
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
}

function postMultipart(path, buffer, filename, fieldName, token) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, buffer, footer]);

  return request({
    hostname: 'localhost',
    port: 8080,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, body);
}

async function runSuite() {
  console.log('================================================================');
  console.log('🚀 PIF TRADING ARENA — AUTOMATED INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1x1 valid PNG with signature
  const validPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
    0x0D, 0x0A, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const timestamp = Date.now();
  const traderAUsername = `trader_a_${timestamp}`;
  const traderAEmail = `trader_a_${timestamp}@arena.com`;
  const traderBUsername = `trader_b_${timestamp}`;
  const traderBEmail = `trader_b_${timestamp}@arena.com`;

  // ─── TEST 1: REGISTRATION & UNIQUENESS ─────────────────────────────────────
  console.log('--- TEST 1: REGISTRATION & UNIQUENESS ---');
  const regA = await postJson('/api/v1/auth/register', {
    username: traderAUsername,
    email: traderAEmail,
    fullName: 'Trader Alpha Test',
    password: 'Password123!'
  });
  assert(regA.statusCode === 201, `Register Trader A returns HTTP 201 (Got ${regA.statusCode})`);
  assert(regA.data?.username === traderAUsername, `Trader A has correct username alias (${regA.data?.username})`);
  assert(regA.data?.token !== undefined, 'Trader A receives valid JWT token upon registration');

  const regB = await postJson('/api/v1/auth/register', {
    username: traderBUsername,
    email: traderBEmail,
    fullName: 'Trader Beta Test',
    password: 'Password123!'
  });
  assert(regB.statusCode === 201, `Register Trader B returns HTTP 201 (Got ${regB.statusCode})`);
  assert(regB.data?.id !== regA.data?.id, `Trader B has distinct unique ID (${regB.data?.id} !== ${regA.data?.id})`);

  // Duplicate username attempt
  const dupUser = await postJson('/api/v1/auth/register', {
    username: traderAUsername,
    email: `unique_${timestamp}@arena.com`,
    password: 'Password123!'
  });
  assert(dupUser.statusCode === 400, `Duplicate username rejected with HTTP 400 (Got ${dupUser.statusCode})`);

  // Duplicate email attempt
  const dupEmail = await postJson('/api/v1/auth/register', {
    username: `unique_name_${timestamp}`,
    email: traderAEmail,
    password: 'Password123!'
  });
  assert(dupEmail.statusCode === 400, `Duplicate email rejected with HTTP 400 (Got ${dupEmail.statusCode})`);

  // ─── TEST 2: AUTHENTICATION & LOGIN FLEXIBILITY ───────────────────────────
  console.log('\n--- TEST 2: AUTHENTICATION & DUAL IDENTIFIER LOGIN ---');
  // Login with email
  const loginByEmail = await postJson('/api/v1/auth/login', {
    email: traderAEmail,
    password: 'Password123!'
  });
  assert(loginByEmail.statusCode === 200, `Login with Email returns HTTP 200 (Got ${loginByEmail.statusCode})`);
  assert(loginByEmail.data?.token !== undefined, 'Login with Email returns token');

  // Login with username
  const loginByUsername = await postJson('/api/v1/auth/login', {
    email: traderAUsername,
    password: 'Password123!'
  });
  assert(loginByUsername.statusCode === 200, `Login with Username returns HTTP 200 (Got ${loginByUsername.statusCode})`);
  assert(loginByUsername.data?.username === traderAUsername, `Profile loaded is Trader A (${loginByUsername.data?.username})`);

  // Verify /api/v1/auth/me
  const tokenA = loginByEmail.data.token;
  const meA = await getJson('/api/v1/auth/me', tokenA);
  assert(meA.statusCode === 200, `GET /api/v1/auth/me returns HTTP 200 for Trader A`);
  assert(meA.data?.email === traderAEmail, `Current user profile matches Trader A email`);

  // ─── TEST 3: LEVEL-BASED CUSTOMIZATION PERMISSIONS API ─────────────────────
  console.log('\n--- TEST 3: CUSTOMIZATION PERMISSIONS API ---');
  const permsA = await getJson('/api/v1/customization/permissions', tokenA);
  assert(permsA.statusCode === 200, `GET /api/v1/customization/permissions returns HTTP 200`);
  assert(permsA.data?.currentLevel === 1, `Trader A is Level 1`);
  assert(permsA.data?.featuresUnlocked?.CUSTOM_AVATAR === false, `Level 1 trader: CUSTOM_AVATAR is locked (false)`);
  assert(permsA.data?.featuresUnlocked?.CUSTOM_BACKGROUND === false, `Level 1 trader: CUSTOM_BACKGROUND is locked (false)`);

  // Login as Adem (Level 25)
  const loginAdem = await postJson('/api/v1/auth/login', {
    email: 'adem@gmail.com',
    password: 'Adem2026!'
  });
  assert(loginAdem.statusCode === 200, `Login as Adem (Level 25) succeeds with HTTP 200`);
  const tokenAdem = loginAdem.data.token;

  const permsAdem = await getJson('/api/v1/customization/permissions', tokenAdem);
  assert(permsAdem.statusCode === 200, `GET permissions for Adem returns HTTP 200`);
  assert(permsAdem.data?.currentLevel === 25, `Adem is Level 25`);
  assert(permsAdem.data?.featuresUnlocked?.CUSTOM_AVATAR === true, `Level 25: CUSTOM_AVATAR is unlocked (true)`);
  assert(permsAdem.data?.featuresUnlocked?.CUSTOM_BACKGROUND === true, `Level 25: CUSTOM_BACKGROUND is unlocked (true)`);
  assert(permsAdem.data?.featuresUnlocked?.ADVANCED_BACKGROUND_EFFECTS === true, `Level 25: ADVANCED_BACKGROUND_EFFECTS is unlocked (true)`);

  // ─── TEST 4: BACKEND ENFORCEMENT ON UPLOADS ────────────────────────────────
  console.log('\n--- TEST 4: BACKEND PERMISSION ENFORCEMENT ON UPLOADS ---');
  // Trader A (Level 1) attempts Avatar upload -> MUST BE 403 FORBIDDEN
  const avatarA = await postMultipart('/api/v1/players/avatar/upload', validPng, 'avatar.png', 'file', tokenA);
  assert(avatarA.statusCode === 403, `Level 1 trader upload avatar is REJECTED with HTTP 403 (Got ${avatarA.statusCode})`);

  // Trader A (Level 1) attempts Background upload -> MUST BE 403 FORBIDDEN
  const bgA = await postMultipart('/api/v1/players/background/upload', validPng, 'bg.png', 'file', tokenA);
  assert(bgA.statusCode === 403, `Level 1 trader upload background is REJECTED with HTTP 403 (Got ${bgA.statusCode})`);

  // Adem (Level 25) attempts Avatar upload -> MUST BE 200 OK
  const avatarAdem = await postMultipart('/api/v1/players/avatar/upload', validPng, 'avatar.png', 'file', tokenAdem);
  assert(avatarAdem.statusCode === 200, `Level 25 trader upload avatar SUCCEEDS with HTTP 200 (Got ${avatarAdem.statusCode})`);
  assert(avatarAdem.data?.profileImageUrl !== undefined, `Avatar URL returned: ${avatarAdem.data?.profileImageUrl}`);

  // Adem (Level 25) attempts Background upload -> MUST BE 200 OK
  const bgAdem = await postMultipart('/api/v1/players/background/upload', validPng, 'bg.png', 'file', tokenAdem);
  assert(bgAdem.statusCode === 200, `Level 25 trader upload background SUCCEEDS with HTTP 200 (Got ${bgAdem.statusCode})`);
  assert(bgAdem.data?.customBackgroundUrl !== undefined, `Background URL returned: ${bgAdem.data?.customBackgroundUrl}`);

  // ─── TEST 5: ACCOUNT ISOLATION & PUBLIC PROFILES ───────────────────────────
  console.log('\n--- TEST 5: ACCOUNT ISOLATION & PRIVACY ---');
  const tokenB = regB.data.token;
  const meB = await getJson('/api/v1/auth/me', tokenB);
  assert(meB.data?.username === traderBUsername, `Trader B private identity is completely isolated (${meB.data?.username})`);
  assert(meB.data?.customBackgroundUrl !== bgAdem.data?.customBackgroundUrl, `Trader B does not inherit Adem's background`);

  // Public profile serving
  const pubAdem = await getJson(`/api/v1/players/${loginAdem.data.id}/public`, tokenA);
  assert(pubAdem.statusCode === 200, `Public profile of Adem is accessible to Trader A`);
  assert(pubAdem.data?.username === 'adem', `Public profile shows username 'adem'`);
  assert(pubAdem.data?.email === undefined, `Public profile does NOT leak private email`);

  // ─── TEST 6: REGRESSION — MULTIPLAYER ARENA ───────────────────────────────
  console.log('\n--- TEST 6: REGRESSION — ROOM CREATION & LISTING ---');
  const createRoom = await postJson('/api/v1/rooms', {
    name: 'Tournoi Test Architecture',
    startDate: '2022-01-01',
    endDate: '2023-12-31',
    initialCash: 100000,
    gameDurationMinutes: 15,
    tickRateMs: 1000
  }, tokenAdem);
  assert(createRoom.statusCode === 201, `Room creation returns HTTP 201 (Got ${createRoom.statusCode})`);
  assert(createRoom.data?.id !== undefined, `Room code generated: ${createRoom.data?.id}`);
  assert(createRoom.data?.creatorUsername === 'adem', `Room creator set to 'adem'`);

  const listRooms = await getJson('/api/v1/rooms');
  assert(listRooms.statusCode === 200, `Room listing returns HTTP 200`);
  assert(Array.isArray(listRooms.data) && listRooms.data.length > 0, `Rooms list is non-empty (${listRooms.data?.length} rooms)`);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

