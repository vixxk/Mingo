import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this._listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.socket.emit('authenticate', token);
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      this.socket.on('disconnect', (reason) => {
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
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_conversation', roomId);
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_conversation', roomId);
    }
  }
}

export const socketService = new SocketService();
