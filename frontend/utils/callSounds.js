import { Audio } from 'expo-av';

/**
 * Non-copyright call sounds (synthesized from sine waves — see
 * scripts/generate-call-sounds.js). Plays the caller ringback while the
 * caller waits for the listener, and an incoming-call chime on the
 * listener side when an incoming call arrives.
 */

let ringtoneSound = null;
let incomingSound = null;
let ringtoneLoading = false;
let incomingLoading = false;

async function loadAndPlay(key, asset, isLooping = true) {
  const existing = key === 'ringtone' ? ringtoneSound : incomingSound;
  const loading = key === 'ringtone' ? ringtoneLoading : incomingLoading;
  if (existing || loading) return; // already playing / loading

  if (key === 'ringtone') ringtoneLoading = true;
  else incomingLoading = true;

  try {
    const { sound } = await Audio.Sound.createAsync(asset, {
      shouldPlay: true,
      isLooping,
      volume: 1,
    });
    if (key === 'ringtone') ringtoneSound = sound;
    else incomingSound = sound;
  } catch (e) {
    console.log('callSounds: failed to play', key, e);
  } finally {
    if (key === 'ringtone') ringtoneLoading = false;
    else incomingLoading = false;
  }
}

async function stopAndUnload(key) {
  const sound = key === 'ringtone' ? ringtoneSound : incomingSound;
  if (!sound) return;

  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch (e) {
    console.log('callSounds: failed to stop', key, e);
  }
  if (key === 'ringtone') ringtoneSound = null;
  else incomingSound = null;
}

export async function playRingtone() {
  await loadAndPlay('ringtone', require('../assets/sounds/ringtone.wav'));
}

export async function stopRingtone() {
  await stopAndUnload('ringtone');
}

export async function playIncomingCallSound() {
  await loadAndPlay('incoming', require('../assets/sounds/incoming-call.wav'));
}

export async function stopIncomingCallSound() {
  await stopAndUnload('incoming');
}
