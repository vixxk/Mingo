import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSSE() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let xhr = null;
    let keepConnecting = true;
    let reconnectTimeout = null;

    const connectSSE = async () => {
      if (!keepConnecting) return;

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setUnreadCount(0);
        reconnectTimeout = setTimeout(connectSSE, 5000);
        return;
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
      const sseUrl = `${baseUrl}/chat/unread-count/sse`;

      console.log('[SSE] Connecting to:', sseUrl);

      xhr = new XMLHttpRequest();
      xhr.open('GET', sseUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      let lastProcessedLength = 0;

      xhr.onreadystatechange = () => {
        if (!keepConnecting) return;

        if (xhr.readyState === 3 || xhr.readyState === 4) {
          try {
            const responseText = xhr.responseText;
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
                      console.log('[SSE] Received unreadCount update:', parsed.unreadCount);
                      setUnreadCount(parsed.unreadCount);
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

        if (xhr.readyState === 4) {
          console.log('[SSE] Connection closed. ReadyState:', xhr.readyState, 'Status:', xhr.status);
          if (keepConnecting) {
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        }
      };

      xhr.onerror = (err) => {
        console.log('[SSE] XHR error:', err);
        if (keepConnecting) {
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      };

      xhr.send();
    };

    connectSSE();

    return () => {
      keepConnecting = false;
      if (xhr) {
        xhr.abort();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return unreadCount;
}
