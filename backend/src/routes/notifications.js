'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

/** POST /api/notifications — Admin only */
router.post(
  '/',
  protect,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Titre requis.'),
    body('message').notEmpty().withMessage('Message requis.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { title, message } = req.body;
      const [result] = await pool.execute(
        'INSERT INTO notifications (title, message, created_by) VALUES (?, ?, ?)',
        [title, message, req.userId]
      );
      
      // Récupérer la notification créée
      const [rows] = await pool.execute(
        'SELECT id, title, message, created_at, created_by FROM notifications WHERE id = ?',
        [result.insertId]
      );
      
      res.json({ success: true, notification: rows[0] });
    } catch (err) {
      console.error('[POST /api/notifications]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** GET /api/notifications — Admin sees view counts, others see is_read */
router.get('/', protect, async (req, res) => {
  try {
    if (req.userRole === 'admin') {
      const [rows] = await pool.execute(`
        SELECT n.id, n.title, n.message, n.created_at, n.created_by,
               COUNT(nr.user_id) AS views_count
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id
        GROUP BY n.id
        ORDER BY n.created_at DESC
      `);
      res.json({ success: true, notifications: rows });
    } else {
      const [rows] = await pool.execute(`
        SELECT n.id, n.title, n.message, n.created_at, n.created_by,
               IF(nr.user_id IS NOT NULL, 1, 0) AS is_read
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        ORDER BY n.created_at DESC
      `, [req.userId]);
      
      const formatted = rows.map(r => ({ ...r, is_read: !!r.is_read }));
      res.json({ success: true, notifications: formatted });
    }
  } catch (err) {
    console.error('[GET /api/notifications]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/notifications/:id/read — Users only */
router.post(
  '/:id/read',
  protect,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      if (req.userRole === 'admin') {
        return res.json({ success: true, message: 'Les admins n\'ont pas de statut de lecture.' });
      }

      const notificationId = req.params.id;
      
      // INSERT IGNORE pour ne pas planter si déjà lu
      await pool.execute(
        'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
        [notificationId, req.userId]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/notifications/:id/read]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** PUT /api/notifications/:id — Admin only */
router.put(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isInt().withMessage('ID invalide.'),
    body('title').notEmpty().withMessage('Titre requis.'),
    body('message').notEmpty().withMessage('Message requis.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, message } = req.body;
      
      const [result] = await pool.execute(
        'UPDATE notifications SET title = ?, message = ? WHERE id = ?',
        [title, message, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Notification introuvable.' });
      }
      
      const [rows] = await pool.execute(
        'SELECT id, title, message, created_at, created_by FROM notifications WHERE id = ?',
        [id]
      );
      
      res.json({ success: true, notification: rows[0] });
    } catch (err) {
      console.error('[PUT /api/notifications/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** DELETE /api/notifications/:id — Admin only */
router.delete(
  '/:id',
  protect,
  adminOnly,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await pool.execute(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Notification introuvable.' });
      }
      
      res.json({ success: true, message: 'Notification supprimée avec succès.' });
    } catch (err) {
      console.error('[DELETE /api/notifications/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;
