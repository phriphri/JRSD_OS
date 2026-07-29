import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export function connectMessagingSocket(token, userId, handlers = {}) {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket.emit('join_room', { userId });
  });

  if (handlers.onNewMessage) socket.on('new_message', handlers.onNewMessage);
  if (handlers.onMessageUpdated) socket.on('message_updated', handlers.onMessageUpdated);
  if (handlers.onMessageDeleted) socket.on('message_deleted', handlers.onMessageDeleted);
  if (handlers.onMessagesRead) socket.on('messages_read', handlers.onMessagesRead);
  if (handlers.onPresence) socket.on('presence_update', handlers.onPresence);

  return socket;
}

export function disconnectMessagingSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
