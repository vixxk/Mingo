/**
 * Verifies that the OneSignal App ID + REST API key in backend/.env actually
 * work. Run:  node scripts/check-onesignal.js
 *
 * Uses the app-scoped endpoints (GET /api/v1/apps/{app_id} + players list) so
 * it works with BOTH the modern v2 organization keys (os_v2_org_...) and the
 * v2 app-level keys (os_v2_app_...) that the user pastes. The legacy
 * "User Auth Key" is deprecated and rejected by OneSignal.
 *
 * Also verifies the app id + key are PAIRED (a valid key for a different app
 * would fail the app check).
 */
require('dotenv').config();
const axios = require('axios');

(async () => {
  const appId = process.env.ONESIGNAL_APP_ID;
  const key = process.env.ONESIGNAL_REST_API_KEY;

  console.log('App ID from .env:', appId || '(missing)');
  console.log('Key from .env   :', key ? `set (${key.length} chars)` : 'NOT SET');
  if (!key) {
    console.log('\nNothing to check — paste the REST API Key into ONESIGNAL_REST_API_KEY in backend/.env first.');
    return;
  }
  const headers = { Authorization: `Basic ${key}` };

  // 1. App-specific endpoint — works with org-level AND app-level v2 keys
  try {
    const app = await axios.get(`https://onesignal.com/api/v1/apps/${appId}`, {
      headers,
      timeout: 10000,
    });
    console.log(`\n✅ APP ID + KEY VERIFIED: ${app.data.name} (${app.data.id})`);
  } catch (e) {
    const status = e.response?.status;
    const errors = JSON.stringify(e.response?.data?.errors) || e.message;
    console.log(`\n❌ APP CHECK FAILED (${status}): ${errors}`);
    if (errors.includes('deprecated')) {
      console.log('   The key is a legacy "User Auth Key" — generate a proper one:');
      console.log('   OneSignal Dashboard → Settings → Keys & IDs → REST API Key');
    } else if (status === 401) {
      console.log('   The key was rejected — double-check it was copied fully, or that it belongs to this OneSignal account.');
    } else if (status === 404) {
      console.log('   Key is valid but for a DIFFERENT app — the App ID in .env does not match the key\'s app.');
    }
    return;
  }

  // 2. Players endpoint — proves the key/app pair is live and shows how many
  //    devices are subscribed (external_user_ids = the app's Mongo user ids)
  try {
    const players = await axios.get(
      `https://onesignal.com/api/v1/players?app_id=${appId}&limit=3`,
      { headers, timeout: 10000 }
    );
    const total = players.data?.total_count ?? '?';
    console.log(`✅ PUSH PIPELINE LIVE — ${total} device(s) subscribed to this app`);
    (players.data?.players || []).forEach((p) => {
      const ext = p.external_user_id ? `ext:${String(p.external_user_id).slice(0, 12)}` : 'no external id';
      console.log(`   - ${p.device_type === 1 ? 'Android' : `device_type ${p.device_type}`}  ${ext}`);
    });
    if (total === 0) {
      console.log('   ⚠️ No devices subscribed yet — open the app once on a device so OneSignal registers it.');
    }
  } catch (e) {
    console.log(`\n⚠️ Players check failed (${e.response?.status || ''}): ${JSON.stringify(e.response?.data?.errors) || e.message}`);
  }
})();
