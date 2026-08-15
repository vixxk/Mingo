/**
 * End-to-end test: audio→video conversion billing split.
 *
 * Boots the REAL app (current src/socket.js) in-process against a dedicated
 * test database, simulates the two devices with real socket.io clients, and
 * verifies the billing split added for audio→video conversions:
 *
 *  1. Audio minutes are billed at the audio rate (10 coins/min) up to the
 *     conversion moment.
 *  2. Video billing STARTS at the conversion moment — the first video minute
 *     (40 coins) is charged immediately, and subsequent video minutes land on
 *     their own cadence anchored at convertedAt (not the call-start cadence).
 *  3. The session records the split: audioDuration/videoDuration,
 *     audioCoinsDeducted/videoCoinsDeducted, audioListenerEarnings/
 *     videoListenerEarnings.
 *  4. The history payloads on BOTH sides (user + listener) carry identical
 *     split numbers, so the UI renders the same costing on both devices.
 *
 * The billing interval is shortened via CALL_BILLING_INTERVAL_MS so the test
 * runs in seconds instead of minutes.
 *
 * Run (from backend/):  node scripts/test-billing-split.js
 */
'use strict';

const path = require('path');

// 1. Load env (for JWT secret, Agora keys, etc.), then spin up an
//    IN-MEMORY MongoDB so the test is fully self-contained and never touches
//    the real database. Set the URI before requiring any app module so
//    config/env picks it up.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoMemoryServer } = require('mongodb-memory-server');
const TEST_DB = 'mingo_billing_test';
process.env.NODE_ENV = 'test';
process.env.CALL_BILLING_INTERVAL_MS = '1500'; // fast billing ticks

let mongod;

// 2. Boot the real app + socket server in-process.
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
const Session = require('../src/models/sessionModel');
const Transaction = require('../src/models/transactionModel');
const CallService = require('../src/services/callService');

const AUDIO_COINS = 10;
const VIDEO_COINS = 40;
const AUDIO_PAYOUT = 1.0;
const VIDEO_PAYOUT = 4.0;

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

async function waitFor(fn, { timeoutMs = 15000, intervalMs = 200, label = '' } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await fn();
    if (val) return val;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

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

const waitEvent = (sock, event, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for socket event "${event}"`)), timeoutMs);
    sock.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

async function main() {
  try {
    mongod = await MongoMemoryServer.create({ instance: { dbName: TEST_DB } });
    // config/env captured MONGO_URI at require time — point it at the memory
    // server so connectDB() uses it.
    config.mongo.uri = mongod.getUri(TEST_DB);
    process.env.MONGO_URI = config.mongo.uri;
  } catch (err) {
    console.error('Could not start in-memory MongoDB:', err.message);
    process.exit(1);
  }
  console.log(`🍃 Test DB: in-memory MongoDB (${TEST_DB})`);
  await connectDB();
  console.log('🍃 Connected. Booting in-process server…');

  const server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`🚀 Server listening on port ${port}`);

  // 3. Test fixtures — created directly so we don't need the whole
  //    listener-matching flow; the socket handlers only need these records.
  const stamp = Date.now();
  const user = await User.create({
    name: 'Billing Test User',
    username: `billing_user_${stamp}`,
    phone: `+91990000${String(stamp).slice(-6)}`,
    role: 'USER',
    coins: 5000,
  });
  const listenerUser = await User.create({
    name: 'Billing Test Listener',
    username: `billing_listener_${stamp}`,
    phone: `+91991111${String(stamp).slice(-6)}`,
    role: 'LISTENER',
    coins: 0,
  });
  const listenerProfile = await Listener.create({
    userId: listenerUser._id,
    displayName: 'Billing Test Listener',
    status: 'approved',
    isOnline: true,
    isBusy: false,
    earnings: 0,
    todayEarnings: 0,
    audioCalls: 0,
    videoCalls: 0,
    todayAudioCalls: 0,
    todayVideoCalls: 0,
    totalSessions: 0,
  });
  const session = await Session.create({
    userId: user._id,
    listenerId: listenerUser._id,
    roomId: `room_billing_${stamp}`,
    callType: 'audio',
    initialCallType: 'audio',
    status: 'active',
    startTime: new Date(),
  });
  const sessionId = session._id.toString();
  const roomId = session.roomId;

  const sign = (id) => jwt.sign({ userId: id.toString() }, config.jwt.secret);
  const userSock = await connectClient(port, sign(user._id));
  const listenerSock = await connectClient(port, sign(listenerUser._id));
  console.log('🔌 Both devices connected & authenticated.');

  const reloadSession = async () => Session.findById(sessionId);

  try {
    // ── Phase 1: audio billing (10 coins/min) ──────────────────────────────
    userSock.emit('start_call_billing', { sessionId });
    await waitFor(
      async () => (await reloadSession()).audioDuration >= 2,
      { label: '2 audio minutes billed (initial + 1 tick)' }
    );
    let s = await reloadSession();
    check('Audio: 2 minutes deducted at audio rate', s.audioDuration === 2 && s.audioCoinsDeducted === 20,
      `audioDuration=${s.audioDuration} audioCoinsDeducted=${s.audioCoinsDeducted}`);
    check('Audio: video segment untouched so far', s.videoDuration === 0 && s.videoCoinsDeducted === 0,
      `videoDuration=${s.videoDuration} videoCoinsDeducted=${s.videoCoinsDeducted}`);
    check('Audio: combined fields track audio only', s.duration === 2 && s.coinsDeducted === 20,
      `duration=${s.duration} coinsDeducted=${s.coinsDeducted}`);

    // ── Phase 2: request + accept the upgrade ──────────────────────────────
    const upgradeRequested = waitEvent(listenerSock, 'call_upgrade_requested');
    userSock.emit('request_call_upgrade', { sessionId, roomId });
    await upgradeRequested;
    console.log('  → listener received call_upgrade_requested');

    const acceptedByUser = waitEvent(userSock, 'call_upgrade_accepted');
    const acceptedByListener = waitEvent(listenerSock, 'call_upgrade_accepted');
    listenerSock.emit('respond_call_upgrade', { sessionId, roomId, accepted: true });
    const [userPayload, listenerPayload] = await Promise.all([acceptedByUser, acceptedByListener]);
    check('Both sides received call_upgrade_accepted (video)',
      userPayload.callType === 'video' && listenerPayload.callType === 'video' && userPayload.isConverted === true,
      `userPayload.callType=${userPayload.callType}`);
    console.log('  → conversion accepted, video session active');

    // The first video minute is charged IMMEDIATELY at conversion (billing
    // restarted anchored at convertedAt) — assert right after the accept.
    s = await waitFor(
      async () => {
        const doc = await reloadSession();
        return doc.videoCoinsDeducted === VIDEO_COINS ? doc : null;
      },
      { label: 'first video minute (40 coins) charged at conversion' }
    );
    check('Video: first minute charged immediately at conversion',
      s.videoDuration === 1 && s.videoCoinsDeducted === 40,
      `videoDuration=${s.videoDuration} videoCoinsDeducted=${s.videoCoinsDeducted}`);
    check('Video: audio segment preserved (audio minutes end at conversion)',
      s.audioDuration === 2 && s.audioCoinsDeducted === 20,
      `audioDuration=${s.audioDuration} audioCoinsDeducted=${s.audioCoinsDeducted}`);
    check('Conversion: session flipped to video with convertedAt set',
      s.callType === 'video' && s.isConverted === true && !!s.convertedAt,
      `callType=${s.callType} convertedAt=${s.convertedAt}`);
    check('Conversion: combined cost = audio + video segments',
      s.coinsDeducted === 60 && s.duration === 3,
      `coinsDeducted=${s.coinsDeducted} duration=${s.duration}`);

    // ── Phase 3: video minute tick on the NEW cadence (40 coins/min) ───────
    s = await waitFor(
      async () => {
        const doc = await reloadSession();
        return doc.videoDuration >= 2 ? doc : null;
      },
      { label: 'second video minute billed (40 coins)' }
    );
    check('Video: second minute on the video cadence at video rate',
      s.videoDuration === 2 && s.videoCoinsDeducted === 80,
      `videoDuration=${s.videoDuration} videoCoinsDeducted=${s.videoCoinsDeducted}`);
    check('Totals: 2 audio (20) + 2 video (80) = 100 coins',
      s.coinsDeducted === 100 && s.duration === 4 && s.audioDuration === 2,
      `coinsDeducted=${s.coinsDeducted} duration=${s.duration}`);

    // User balance + listener earnings
    const freshUser = await User.findById(user._id);
    check('User balance deducted 100 coins (5000 → 4900)', freshUser.coins === 4900,
      `coins=${freshUser.coins}`);
    const freshListener = await Listener.findOne({ userId: listenerUser._id });
    check('Listener earnings = 2×₹1 + 2×₹4 = ₹10', Math.abs((freshListener.earnings || 0) - 10) < 0.001,
      `earnings=${freshListener.earnings}`);
    check('Session listenerEarnings split recorded', Math.abs(s.listenerEarnings - 10) < 0.001
      && Math.abs(s.audioListenerEarnings - 2) < 0.001 && Math.abs(s.videoListenerEarnings - 8) < 0.001,
      `listenerEarnings=${s.listenerEarnings} audio=${s.audioListenerEarnings} video=${s.videoListenerEarnings}`);

    // ── Phase 4: end the call, then verify history on BOTH sides ───────────
    userSock.emit('call_ended', { sessionId, roomId });
    await waitFor(
      async () => (await reloadSession()).status === 'completed',
      { label: 'session completed' }
    );

    const userHistory = await CallService.getUserHistory(user._id, 20, 0);
    const listenerHistory = await CallService.getListenerHistory(listenerUser._id, 20, 0);
    const uh = userHistory.find((h) => h._id.toString() === sessionId);
    const lh = listenerHistory.find((h) => h._id.toString() === sessionId);
    check('History present on both sides', !!uh && !!lh);
    if (uh && lh) {
      const both = (a, b, label) => check(`History sync: ${label} identical on both sides`, a === b, `user=${a} listener=${b}`);
      both(uh.isConverted, lh.isConverted, 'isConverted');
      both(uh.callType, lh.callType, 'callType');
      both(uh.initialCallType, lh.initialCallType, 'initialCallType');
      both(uh.audioDuration, lh.audioDuration, 'audioDuration');
      both(uh.videoDuration, lh.videoDuration, 'videoDuration');
      both(uh.audioCoinsDeducted, lh.audioCoinsDeducted, 'audioCoinsDeducted');
      both(uh.videoCoinsDeducted, lh.videoCoinsDeducted, 'videoCoinsDeducted');
      both(uh.coinsDeducted, lh.coinsDeducted, 'coinsDeducted');
      both(uh.listenerEarnings, lh.listenerEarnings, 'listenerEarnings');
      both(uh.audioListenerEarnings, lh.audioListenerEarnings, 'audioListenerEarnings');
      both(uh.videoListenerEarnings, lh.videoListenerEarnings, 'videoListenerEarnings');
      check('History carries the UI split fields',
        uh.isConverted === true && uh.audioDuration === 2 && uh.videoDuration === 2
        && uh.audioCoinsDeducted === 20 && uh.videoCoinsDeducted === 80
        && uh.coinsDeducted === 100 && uh.listenerEarnings === 10,
        JSON.stringify({ a: uh.audioDuration, v: uh.videoDuration, ac: uh.audioCoinsDeducted, vc: uh.videoCoinsDeducted, c: uh.coinsDeducted, e: uh.listenerEarnings }));
    }
  } finally {
    // ── Cleanup: remove test data, close connections ──────────────────────
    console.log('\n🧹 Cleaning up test data…');
    await Session.deleteMany({ _id: session._id });
    await Transaction.deleteMany({ $or: [{ userId: user._id }, { userId: listenerUser._id }] });
    await Listener.deleteMany({ userId: listenerUser._id });
    await User.deleteMany({ _id: { $in: [user._id, listenerUser._id] } });
    await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, listenerUser._id.toString());
    // Disconnect the clients first and give the server-side disconnect handlers
    // a beat to finish before tearing down mongoose/redis.
    userSock.disconnect();
    listenerSock.disconnect();
    await sleep(500);
    server.close();
    redis.disconnect();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Assertions: ${assertions}  |  Failures: ${failures}`);
  console.log(failures === 0 ? '🎉 ALL BILLING-SPLIT CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
