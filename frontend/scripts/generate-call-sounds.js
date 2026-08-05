/**
 * Generate non-copyright call sounds for Mingo.
 *
 * Both files are synthesized from scratch from pure sine waves — they are
 * original, functional signaling tones (no melody, no samples, no third-party
 * assets), so there is no copyright or licensing concern.
 *
 * Run: node scripts/generate-call-sounds.js
 * Output: ../assets/sounds/ringtone.wav and ../assets/sounds/incoming-call.wav
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);            // fmt chunk size
  buffer.writeUInt16LE(1, 20);             // PCM
  buffer.writeUInt16LE(1, 22);             // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);             // block align
  buffer.writeUInt16LE(16, 34);            // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    let v = samples[i];
    if (v > 1) v = 1;
    if (v < -1) v = -1;
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
  console.log('Wrote', filePath, `(${Math.round(buffer.length / 1024)} KB)`);
}

// Dual-tone burst (like the classic telecom ringback: 440Hz + 480Hz),
// with attack/release envelopes to avoid clicks.
function burst(durSec, vol = 0.4) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, i / (0.006 * SAMPLE_RATE));
    const release = Math.min(1, (n - i) / (0.03 * SAMPLE_RATE));
    const env = Math.min(attack, release);
    const s =
      (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) / 2;
    out[i] = s * vol * env;
  }
  return out;
}

function silence(durSec) {
  return new Array(Math.floor(durSec * SAMPLE_RATE)).fill(0);
}

// Single note with soft envelope + trailing gap.
function note(freq, durSec, vol = 0.45, gapSec = 0.06) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const gap = Math.floor(gapSec * SAMPLE_RATE);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, i / (0.01 * SAMPLE_RATE));
    const release = Math.min(1, (n - i) / (0.09 * SAMPLE_RATE));
    const env = Math.min(attack, release);
    out.push(Math.sin(2 * Math.PI * freq * t) * vol * env);
  }
  for (let i = 0; i < gap; i++) out.push(0);
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// 1) ringtone.wav — caller ringback: "ring-ring … pause" repeating loop.
//    The 440/480 Hz dual tone is the standard telecom ringback cadence
//    (a functional signaling tone, not a copyrighted melody).
const RINGTONE = [
  ...burst(0.55),
  ...silence(0.35),
  ...burst(0.55),
  ...silence(2.55),
];
writeWav(path.join(OUT_DIR, 'ringtone.wav'), RINGTONE);

// 2) incoming-call.wav — original pleasant ascending chime (E5 → G5 → C6),
//    played twice, clearly distinct from the caller ringback.
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const INCOMING = [
  ...note(E5, 0.28),
  ...note(G5, 0.28),
  ...note(C6, 0.42, 0.5),
  ...silence(0.25),
  ...note(E5, 0.28),
  ...note(G5, 0.28),
  ...note(C6, 0.42, 0.5),
  ...silence(0.9),
];
writeWav(path.join(OUT_DIR, 'incoming-call.wav'), INCOMING);
