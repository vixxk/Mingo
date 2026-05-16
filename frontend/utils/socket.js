import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this._listeners = new Map(); // event -> Set of callbacks
  }

  async connect() {
    if (this.socket?.connected) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket = socket;

      // Debug: Log all incoming events
      socket.onAny((eventName, ...args) => {
        console.log(`[SocketService Debug] Incoming Event: ${eventName}, Data:`, args);
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('authenticate', token);
        
        // Re-attach all listeners to the new socket object
        this._listeners.forEach((callbacks, event) => {
          callbacks.forEach(cb => {
            socket.on(event, cb);
          });
        });
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

    } catch (e) {
      console.error('Failed to init socket', e);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // We keep _listeners so they can be re-attached on next connect
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  emit(event, data) {
    if (this.socket) {
      console.log(`[SocketService] Emitting ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.log(`[SocketService] Cannot emit ${event} - no socket`);
    }
  }

  on(event, callback) {
    console.log(`[SocketService] Registering listener for: ${event}`);
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    console.log(`[SocketService] Removing listener for: ${event}`);
    if (this._listeners.has(event)) {
      if (callback) {
        this._listeners.get(event).delete(callback);
      } else {
        this._listeners.delete(event);
      }
    }

    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  joinRoom(roomId) {
    console.log('[SocketService] Calling joinRoom:', roomId);
    this.emit('join_conversation', roomId);
  }

  leaveRoom(roomId) {
    this.emit('leave_conversation', roomId);
  }
}

export const socketService = new SocketService();
