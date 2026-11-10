import { io } from 'socket.io-client';

let socketInstance = null;
let staffToken = null;

export function setSocketAuthToken(token) {
  staffToken = token || null;
  if (!socketInstance) return;
  socketInstance.auth = staffToken ? { token: staffToken } : {};
  socketInstance.disconnect();
  socketInstance.connect();
}

export function getSocket() {
  if (!socketInstance) {
    // In dev Vite proxies /socket.io, in production relative path works
    socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: staffToken ? { token: staffToken } : {}
    });

    socketInstance.on('connect', () => {
      console.log('Connected to real-time Print Plus server:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Real-time connection notice:', err.message);
    });
  }
  return socketInstance;
}
