import { DevSettings } from 'react-native';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';

/**
 * Restart the app after a role switch.
 * 
 * In development (__DEV__), DevSettings.reload() reloads the JS bundle.
 * In production builds, Updates.reloadAsync() triggers a full native reload,
 * identical to a cold start — the entire JS bundle re-evaluates from scratch.
 * As a final fallback, we navigate to the splash screen with a cache-busting
 * param to force the splash useEffect to re-run.
 */
export async function restartApp() {
  if (__DEV__) {
    try {
      DevSettings.reload();
      return;
    } catch (e) {
      // Fall through to navigation-based restart
    }
  } else {
    // Production: use expo-updates to do a real native reload
    try {
      await Updates.reloadAsync();
      return; // won't actually reach here — reloadAsync kills the JS context
    } catch (e) {
      console.log('[restartApp] Updates.reloadAsync() failed, falling back to navigation:', e);
      // Fall through to navigation-based restart
    }
  }

  // Final fallback: navigate to splash with cache-busting param
  try {
    while (router.canGoBack()) {
      router.back();
    }
  } catch (e) {}

  router.replace({
    pathname: '/',
    params: { _restart: Date.now().toString() },
  });
}
