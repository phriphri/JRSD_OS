'use strict';

/**
 * userNotifications.js — Routes pour les notifications automatiques par utilisateur
 *
 * GET    /api/user-notifications           → liste (50 dernières)
 * GET    /api/user-notifications/unread-count
 * POST   /api/user-notifications/:id/read  → marquer une notif lue
 * POST   /api/user-notifications/read-all  → marquer toutes lues
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { pool } = require('../config/db');

const router = express.Router();

// Table auto-créée via migration 003 — aucun ensureSchema() nécessaire ici.

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

/** GET /api/user-notifications — 50 dernières notifs de l'utilisateur */
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, type, title, body, link, entity_type, entity_id, is_read, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    const notifications = rows.map((r) => ({ ...r, is_read: !!r.is_read }));
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('[GET /api/user-notifications]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/user-notifications/unread-count */
router.get('/unread-count', protect, async (req, res) => {
  try {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM user_notifications WHERE user_id = ? AND is_read = 0',
      [req.userId]
    );
    res.json({ success: true, count: Number(count) });
  } catch (err) {
    console.error('[GET /api/user-notifications/unread-count]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/user-notifications/read-all — marquer toutes comme lues */
router.post('/read-all', protect, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/user-notifications/read-all]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/user-notifications/:id/read — marquer une notif lue */
router.post(
  '/:id/read',
  protect,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      await pool.execute(
        'UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [req.params.id, req.userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/user-notifications/:id/read]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;
