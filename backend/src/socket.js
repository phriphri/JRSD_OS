'use strict';

const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

let io = null;
const userSocketCounts = new Map();

function getOnlineUsers() {
  return [...userSocketCounts.keys()].map(Number);
}

function broadcastPresence() {
  if (!io) return;
  io.emit('presence_update', { onlineUsers: getOnlineUsers() });
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || origin.startsWith('http://localhost:')) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentification requise.'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Token invalide.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    userSocketCounts.set(userId, (userSocketCounts.get(userId) || 0) + 1);
    broadcastPresence();

    socket.on('join_room', (payload) => {
      const roomUserId = payload?.userId || payload || userId;
      socket.join(`user:${roomUserId}`);
    });

    socket.on('disconnect', () => {
      const count = (userSocketCounts.get(userId) || 1) - 1;
      if (count <= 0) userSocketCounts.delete(userId);
      else userSocketCounts.set(userId, count);
      broadcastPresence();
    });
  });

  return io;
}

module.exports = { initSocket, emitToUser, getOnlineUsers };
