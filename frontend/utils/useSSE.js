import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSSE() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPeopleCount, setUnreadPeopleCount] = useState(0);

  useEffect(() => {
    let xhr = null;
    let keepConnecting = true;
    let reconnectTimeout = null;

    const connectSSE = async () => {
      if (!keepConnecting) return;

      const token = await AsyncStorage.getItem('token');
      if (!keepConnecting) return;

      if (!token) {
        setUnreadCount(0);
        setUnreadPeopleCount(0);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 5000);
        return;
      }

      if (xhr) {
        try { xhr.abort(); } catch (e) {}
        xhr = null;
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const sseUrl = `${baseUrl}/chat/unread-count/sse`;

      const localXhr = new XMLHttpRequest();
      xhr = localXhr;

      localXhr.open('GET', sseUrl);
      localXhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      let lastProcessedLength = 0;

      localXhr.onreadystatechange = () => {
        if (!keepConnecting || xhr !== localXhr) {
          try { localXhr.abort(); } catch (e) {}
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
                    if (parsed && typeof parsed.unreadCount === 'number') {
                      setUnreadCount(parsed.unreadCount);
                    }
                    if (parsed && typeof parsed.unreadPeopleCount === 'number') {
                      setUnreadPeopleCount(parsed.unreadPeopleCount);
                    }
                  } catch (e) {
                    console.log('[SSE] Error parsing chunk JSON:', e.message);
                  }
                }
              }
            }
          } catch (e) {
            console.log('[SSE] Error reading chunk:', e.message);
          }
        }

        if (localXhr.readyState === 4) {
          if (keepConnecting && xhr === localXhr) {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        }
      };

      localXhr.onerror = () => {
        if (keepConnecting && xhr === localXhr) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      };

      localXhr.send();
    };

    const disconnectSSE = () => {
      if (xhr) {
        try { xhr.abort(); } catch (e) {}
        xhr = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    connectSSE();

    const handleAppStateChange = (nextAppState) => {
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
  }, []);

  return { unreadCount, unreadPeopleCount };
}
