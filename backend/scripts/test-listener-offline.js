/**
 * End-to-end test: auto-offline when a listener's app is closed from RAM.
 *
 * Boots the REAL app (current src/socket.js) in-process against an in-memory
 * MongoDB and a real socket.io client, then verifies:
 *
 *  1. When a listener's last socket drops and they DON'T reconnect within the
 *     grace period (force-closed app), the listener is auto-marked offline:
 *     DB isOnline=false, Redis ONLINE key removed, availability set cleaned.
 *  2. A quick reconnect within the grace period cancels the timer and the
 *     listener stays online (network blip case).
 *  3. Reconnecting and emitting app_foregrounded also cancels it (app merely
 *     backgrounded case).
 *
 * The grace period is shortened via DISCONNECT_OFFLINE_GRACE_MS.
 *
 * Run (from backend/):  node scripts/test-listener-offline.js
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoMemoryServer } = require('mongodb-memory-server');

const TEST_DB = 'mingo_offline_test';
process.env.NODE_ENV = 'test';
process.env.DISCONNECT_OFFLINE_GRACE_MS = '800';

let mongod;

const { connectDB, mongoose } = require('../src/config/database');
const http = require('http');
const app = require('../src/app');
const { initSocket } = require('../src/socket');
const config = require('../src/config/env');
const jwt = require('jsonwebtoken');
const { io: Client } = require('socket.io-client');
const { redis, REDIS_KEYS } = require('../src/config/redis');
const User = require('../src/models/userModel');
const Listener = require('../src/models/listenerModel');
const PresenceService = require('../src/services/presenceService');

let assertions = 0;
let failures = 0;

function check(name, cond, detail) {
  assertions++;
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectClient = (port, token) =>
  new Promise((resolve, reject) => {
    const sock = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    sock.on('connect', () => resolve(sock));
    sock.on('connect_error', reject);
    setTimeout(() => reject(new Error('client connect timeout')), 8000);
  });

async function main() {
  try {
    mongod = await MongoMemoryServer.create({ instance: { dbName: TEST_DB } });
    config.mongo.uri = mongod.getUri(TEST_DB);
    process.env.MONGO_URI = config.mongo.uri;
  } catch (err) {
    console.error('Could not start in-memory MongoDB:', err.message);
    process.exit(1);
  }

  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const stamp = Date.now();
  const listenerUser = await User.create({
    name: 'Offline Test Listener',
    username: `offline_listener_${stamp}`,
    phone: `+91992222${String(stamp).slice(-6)}`,
    role: 'LISTENER',
    coins: 0,
  });
  const listenerProfile = await Listener.create({
    userId: listenerUser._id,
    displayName: 'Offline Test Listener',
    status: 'approved',
    isOnline: true,
    isBusy: false,
    earnings: 0,
    todayEarnings: 0,
  });
  const userId = listenerUser._id;
  const userIdStr = userId.toString();
  const sign = (id) => jwt.sign({ userId: id.toString() }, config.jwt.secret);

  const isOnlineNow = async () => {
    const l = await Listener.findOne({ userId });
    return !!(l && l.isOnline);
  };
  const onlineKeyGone = async () => !(await redis.exists(REDIS_KEYS.ONLINE(userIdStr)));
  const availableGone = async () => !(await redis.sismember(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr));

  let sock;
  try {
    // ── Test 1: force-close (no reconnect) → auto-offline after grace ─────
    await PresenceService.goOnline(userId);
    check('Setup: listener online', await isOnlineNow());

    sock = await connectClient(port, sign(userId));
    sock.disconnect();
    // Let the disconnect handler schedule + fire the 800ms grace timer.
    await sleep(2500);

    check('Force-close: DB isOnline=false', !(await isOnlineNow()));
    check('Force-close: Redis ONLINE key removed', await onlineKeyGone());
    check('Force-close: availability set cleaned', await availableGone());

    // ── Test 2: quick reconnect within grace → stays online ───────────────
    await PresenceService.goOnline(userId);
    sock = await connectClient(port, sign(userId));
    sock.disconnect();
    await sleep(300); // reconnect BEFORE the 800ms grace elapses
    sock = await connectClient(port, sign(userId));
    await sleep(2000); // past the original grace window
    check('Quick reconnect: listener stays online', await isOnlineNow());
    sock.disconnect();
    await sleep(1500); // let the eventual offline timer settle

    // ── Test 3: reconnect + app_foregrounded within grace → stays online ──
    await PresenceService.goOnline(userId);
    sock = await connectClient(port, sign(userId));
    sock.disconnect();
    await sleep(300);
    sock = await connectClient(port, sign(userId));
    sock.emit('app_foregrounded');
    await sleep(2000);
    check('Foreground within grace: listener stays online', await isOnlineNow());
  } finally {
    sock && sock.disconnect();
    await sleep(500);
    await Listener.deleteMany({ userId });
    await User.deleteMany({ _id: userId });
    await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    server.close();
    redis.disconnect();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Assertions: ${assertions}  |  Failures: ${failures}`);
  console.log(failures === 0 ? '🎉 ALL AUTO-OFFLINE CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
