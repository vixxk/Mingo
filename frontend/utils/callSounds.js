import { Audio } from 'expo-av';

let ringtoneSound = null;
let incomingSound = null;
let ringtoneLoading = false;
let incomingLoading = false;

async function configureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.log('callSounds: Audio mode config error', e);
  }
}

async function loadAndPlay(key, asset, isLooping = true) {
  const existing = key === 'ringtone' ? ringtoneSound : incomingSound;
  const loading = key === 'ringtone' ? ringtoneLoading : incomingLoading;
  if (existing || loading) return true; // already playing / loading

  if (key === 'ringtone') ringtoneLoading = true;
  else incomingLoading = true;

  try {
    await configureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      asset,
      {
        shouldPlay: true,
        isLooping,
        volume: 1.0,
      }
    );
    await sound.setVolumeAsync(1.0);
    await sound.setIsLoopingAsync(isLooping);
    await sound.playAsync();

    if (key === 'ringtone') ringtoneSound = sound;
    else incomingSound = sound;
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
  if (incomingSound) return;

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
  
  if (!loadedCustom && !incomingSound) {
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
