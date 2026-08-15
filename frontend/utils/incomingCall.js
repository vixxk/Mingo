import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';

/**
 * Thin JS wrapper around the native Android incoming-call card
 * (IncomingCallModule, added by plugins/withIncomingCall.js).
 *
 * The native layer shows the WhatsApp-style full-screen card + looping
 * ringtone when an incoming call push arrives while the app is backgrounded or
 * killed, and forwards Accept / Decline / Open back into the app. Everything
 * here is a safe no-op on iOS / Expo Go / web so the app keeps working there
 * without the native module.
 */
const native = Platform.OS === 'android' ? NativeModules.IncomingCallModule : null;

export const incomingCallNative = {
  /** Whether the native card is available on this build. */
  isAvailable: () => !!native,

  /** Dismiss the native card + notification + ringtone (call answered,
   *  rejected, cancelled). */
  stopIncomingCall() {
    if (!native) return;
    try {
      native.stopIncomingCall();
    } catch (e) {
      console.log('[IncomingCall] stopIncomingCall error:', e);
    }
  },

  /** Close the card + stop the ringtone but keep the shade notification —
   *  used when the app returns to the foreground so the in-app popup takes
   *  over without a call ever being silently dropped. */
  dismissCard() {
    if (!native) return;
    try {
      native.dismissCard();
    } catch (e) {
      console.log('[IncomingCall] dismissCard error:', e);
    }
  },

  /** Show the native card from JS — used when the socket fires while the app
   *  is backgrounded but still running, before the push arrives. The native
   *  side ignores this while the app is in the foreground (the in-app popup
   *  handles that case). */
  showIncomingCall(payload) {
    if (!native || !payload) return;
    try {
      native.showIncomingCall(payload);
    } catch (e) {
      console.log('[IncomingCall] showIncomingCall error:', e);
    }
  },

  /** Resolves to { action, payload } when the app was cold-started from the
   *  native card's Accept/Decline/Open while killed, else null. */
  getPendingCallAction() {
    return new Promise((resolve) => {
      if (!native) return resolve(null);
      try {
        native.getPendingCallAction((action, payloadJson) => {
          if (action && payloadJson) {
            try {
              resolve({ action, payload: JSON.parse(payloadJson) });
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  },
};

/** Subscribe to accept/decline/open actions tapped on the native card while
 *  the app is running in the background. Returns an unsubscribe function. */
export function onIncomingCallAction(listener) {
  if (!native) return () => {};
  const subscription = DeviceEventEmitter.addListener('IncomingCallAction', (event) => {
    try {
      const action = event?.action;
      const payload = event?.payload ? JSON.parse(event.payload) : null;
      if (action && payload) listener(action, payload);
    } catch (e) {
      console.log('[IncomingCall] action event error:', e);
    }
  });
  return () => subscription.remove();
}
