// ============================================================
//  J-RSD OS — Serveur Express + Socket.io
// ============================================================

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
// const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/db');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const projectsRoutes = require('./routes/projects');
const teamsRoutes = require('./routes/teams');
const messagesRoutes = require('./routes/messages');
const agentsRoutes = require('./routes/agents');
const tasksRoutes = require('./routes/tasks');
const notificationsRoutes = require('./routes/notifications');
const planningRoutes = require('./routes/planning');
const dashboardRoutes = require('./routes/dashboard');
const documentsRoutes = require('./routes/documents');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

initSocket(server);

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://jrsdos-production.up.railway.app',
    ];

    if (
      !origin ||
      origin.startsWith('http://localhost:') ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Les limites de requêtes ont été désactivées à la demande de l'utilisateur
// pour éviter les erreurs "Trop de requêtes" lors de la connexion et globalement.

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', agentsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentsRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Erreur non gérée :', err.stack || err.message);
  res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
});

async function start() {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`\n🚀  Serveur J-RSD OS → http://localhost:${PORT}`);
    console.log(`    Socket.io   : activé`);
    console.log(`    Mode        : ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start();
