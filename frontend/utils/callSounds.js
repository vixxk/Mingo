import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let ringtonePlayer = null;
let incomingPlayer = null;
let ringtoneLoading = false;
let incomingLoading = false;
let currentIsSpeaker = false; // Default: normal earpiece mode

async function configureAudioMode(isSpeaker = currentIsSpeaker) {
  try {
    currentIsSpeaker = !!isSpeaker;
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: !currentIsSpeaker,
    });
  } catch (e) {
    console.log('callSounds: Audio mode config error', e);
  }
}

export async function setAudioOutputMode(isSpeaker) {
  currentIsSpeaker = !!isSpeaker;
  await configureAudioMode(currentIsSpeaker);
}

async function loadAndPlay(key, asset, isLooping = true) {
  const existing = key === 'ringtone' ? ringtonePlayer : incomingPlayer;
  const loading = key === 'ringtone' ? ringtoneLoading : incomingLoading;
  if (existing || loading) return true; // already playing / loading

  if (key === 'ringtone') ringtoneLoading = true;
  else incomingLoading = true;

  try {
    await configureAudioMode();
    const player = createAudioPlayer(asset);
    player.loop = isLooping;
    player.volume = 1.0;
    player.play();

    if (key === 'ringtone') ringtonePlayer = player;
    else incomingPlayer = player;
    return true;
  } catch (e) {
    console.log('callSounds: failed to play', key, e);
    throw e;
  } finally {
    if (key === 'ringtone') ringtoneLoading = false;
    else incomingLoading = false;
  }
}

async function stopAndUnload(key) {
  const player = key === 'ringtone' ? ringtonePlayer : incomingPlayer;
  if (!player) return;

  try {
    player.pause();
    player.remove?.();
  } catch (e) {
    console.log('callSounds: failed to stop', key, e);
  }
  if (key === 'ringtone') ringtonePlayer = null;
  else incomingPlayer = null;
}

export async function playRingtone() {
  try {
    await loadAndPlay('ringtone', require('../assets/sounds/ringtone.wav'));
  } catch (e) {
    console.log('callSounds: playRingtone error', e);
  }
}

export async function stopRingtone() {
  await stopAndUnload('ringtone');
}

export async function playIncomingCallSound(customUrl) {
  // If already playing, don't restart
  if (incomingPlayer) return;

  let loadedCustom = false;
  if (customUrl && typeof customUrl === 'string' && (customUrl.startsWith('http://') || customUrl.startsWith('https://'))) {
    try {
      await loadAndPlay('incoming', { uri: customUrl });
      loadedCustom = true;
    } catch (e) {
      console.log('callSounds: custom ringtone URL failed, falling back to default sound:', e.message);
      await stopAndUnload('incoming');
    }
  }
  
  if (!loadedCustom && !incomingPlayer) {
    try {
      await loadAndPlay('incoming', require('../assets/sounds/incoming-call.wav'));
    } catch (e) {
      console.log('callSounds: fallback incoming call sound error', e);
    }
  }
}

export async function stopIncomingCallSound() {
  await stopAndUnload('incoming');
}
