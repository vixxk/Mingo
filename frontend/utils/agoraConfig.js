// Agora RTC credentials for VIDEO calls.
//
// The App ID is provided through the EXPO_PUBLIC_AGORA_APP_ID environment
// variable (see .env.example). It must match the backend's AGORA_APP_ID —
// the backend mints the actual RTC tokens per session. The App ID below is
// only a placeholder so the app still boots before the env var is set.
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '8834c7bd129d4aba90bc322fdba03b4b';

// True when a real Agora App ID has been configured. Placeholder values (or
// an empty string) make the video-call screen fall back to the avatar-preview
// UI instead of attempting to join a channel.
export const isAgoraConfigured =
  !!AGORA_APP_ID && !/your_agora|placeholder|change_me/i.test(AGORA_APP_ID);
