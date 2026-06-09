import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStatusSSE(onStatusChanged) {
  useEffect(() => {
    let xhr = null;
    let keepConnecting = true;
    let reconnectTimeout = null;

    const connectSSE = async () => {
      if (!keepConnecting) return;

      const token = await AsyncStorage.getItem('token');
      if (!keepConnecting) return;

      if (!token) {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 5000);
        return;
      }

      // Abort any existing connection before starting a new one
      if (xhr) {
        console.log('[Status SSE] Aborting existing XHR connection before initiating new one');
        try {
          xhr.abort();
        } catch (e) {
          console.log('[Status SSE] Error aborting existing XHR:', e.message);
        }
        xhr = null;
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const sseUrl = `${baseUrl}/listeners/status/sse`;

      console.log('[Status SSE] Connecting to:', sseUrl);

      const localXhr = new XMLHttpRequest();
      xhr = localXhr;

      localXhr.open('GET', sseUrl);
      localXhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      let lastProcessedLength = 0;

      localXhr.onreadystatechange = () => {
        if (!keepConnecting || xhr !== localXhr) {
          try {
            localXhr.abort();
          } catch (e) {}
          return;
        }

        if (localXhr.readyState === 3 || localXhr.readyState === 4) {
          try {
            const responseText = localXhr.responseText;
            if (responseText.length > lastProcessedLength) {
              const newChunk = responseText.substring(lastProcessedLength);
              lastProcessedLength = responseText.length;

              const lines = newChunk.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                  const dataStr = trimmed.substring(5).trim();
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed && parsed.userId) {
                      console.log('[Status SSE] Received update:', parsed);
                      if (onStatusChanged) {
                        onStatusChanged(parsed);
                      }
                    }
                  } catch (e) {
                    console.log('[Status SSE] Error parsing chunk JSON:', e.message);
                  }
                }
              }
            }
          } catch (e) {
            console.log('[Status SSE] Error reading chunk:', e.message);
          }
        }

        if (localXhr.readyState === 4) {
          console.log('[Status SSE] Connection closed. ReadyState:', localXhr.readyState, 'Status:', localXhr.status);
          if (keepConnecting && xhr === localXhr) {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        }
      };

      localXhr.onerror = (err) => {
        console.log('[Status SSE] XHR error:', err);
        if (keepConnecting && xhr === localXhr) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      };

      localXhr.send();
    };

    const disconnectSSE = () => {
      if (xhr) {
        console.log('[Status SSE] Aborting connection due to background/disposal');
        try {
          xhr.abort();
        } catch (e) {}
        xhr = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    connectSSE();

    // Reconnect / Disconnect on App State change
    const handleAppStateChange = (nextAppState) => {
      console.log('[Status SSE] AppState transition:', nextAppState);
      if (nextAppState === 'active') {
        keepConnecting = true;
        connectSSE();
      } else {
        keepConnecting = false;
        disconnectSSE();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      keepConnecting = false;
      disconnectSSE();
    };
  }, [onStatusChanged]);
}
