'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { pool } = require('../config/db');
const { emitToUser, getOnlineUsers } = require('../socket');
const notifService = require('../services/notifService');

const router = express.Router();

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';

  for (const col of ['is_modified', 'is_deleted', 'is_read']) {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'direct_messages' AND COLUMN_NAME = ?`,
      [dbName, col]
    );
    if (cols.length === 0) {
      await pool.execute(
        `ALTER TABLE direct_messages ADD COLUMN ${col} BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }
  }
  schemaReady = true;
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapMessageRow(row) {
  const isDeleted = !!row.is_deleted;
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: isDeleted ? 'Ce message a été supprimé' : row.contenu,
    isModified: !!row.is_modified,
    isDeleted,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

async function markMessagesAsRead(readerId, contactId) {
  const [unread] = await pool.execute(
    `SELECT id FROM direct_messages
     WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE AND is_deleted = FALSE`,
    [readerId, contactId]
  );
  if (!unread.length) return [];

  const ids = unread.map((r) => r.id);
  await pool.execute(
    `UPDATE direct_messages SET is_read = TRUE
     WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE`,
    [readerId, contactId]
  );

  emitToUser(contactId, 'messages_read', { contactId: readerId, messageIds: ids });
  return ids;
}

router.use(async (_req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[messages ensureSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur schéma messages.' });
  }
});

/** GET /api/messages/unread-count */
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM direct_messages
       WHERE receiver_id = ? AND is_read = FALSE AND is_deleted = FALSE`,
      [userId]
    );
    const totalUnread = rows[0].total || 0;
    res.json({ success: true, totalUnread });
  } catch (err) {
    console.error('[GET /api/messages/unread-count]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/messages/conversations */
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await pool.execute(
      `SELECT
         c.contact_id,
         u.nom_prenom,
         u.email,
         u.fonction,
         u.role,
         c.last_at,
         lm.contenu AS last_content,
         lm.sender_id AS last_sender_id,
         lm.is_deleted AS last_is_deleted,
         lm.is_modified AS last_is_modified
       FROM (
         SELECT other_user_id AS contact_id, MAX(created_at) AS last_at
         FROM (
           SELECT receiver_id AS other_user_id, created_at
           FROM direct_messages WHERE sender_id = ?
           UNION ALL
           SELECT sender_id AS other_user_id, created_at
           FROM direct_messages WHERE receiver_id = ?
         ) conv
         GROUP BY other_user_id
       ) c
       INNER JOIN users u ON u.id = c.contact_id
       INNER JOIN direct_messages lm ON lm.created_at = c.last_at
         AND (
           (lm.sender_id = ? AND lm.receiver_id = c.contact_id)
           OR (lm.sender_id = c.contact_id AND lm.receiver_id = ?)
         )
       ORDER BY c.last_at DESC`,
      [userId, userId, userId, userId]
    );

    // Récupérer le nombre de messages non lus par expéditeur pour cet utilisateur
    const [unreadRows] = await pool.execute(
      `SELECT sender_id, COUNT(*) AS count
       FROM direct_messages
       WHERE receiver_id = ? AND is_read = FALSE AND is_deleted = FALSE
       GROUP BY sender_id`,
      [userId]
    );

    const unreadMap = {};
    for (const r of unreadRows) {
      unreadMap[r.sender_id] = Number(r.count);
    }

    const conversations = rows.map((r) => ({
      contactId: r.contact_id,
      nomPrenom: r.nom_prenom,
      email: r.email,
      fonction: r.fonction,
      role: r.role,
      lastMessageAt: r.last_at,
      lastMessage: r.last_is_deleted
        ? 'Ce message a été supprimé'
        : r.last_content,
      lastSenderId: r.last_sender_id,
      unreadCount: unreadMap[r.contact_id] || 0,
      isOnline: getOnlineUsers().includes(r.contact_id),
    }));

    res.json({ success: true, conversations, onlineUsers: getOnlineUsers() });
  } catch (err) {
    console.error('[GET /api/messages/conversations]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/messages/:contactId/mark-read */
router.post(
  '/:contactId/mark-read',
  protect,
  [param('contactId').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.userId;
      const contactId = req.params.contactId;
      const messageIds = await markMessagesAsRead(userId, contactId);
      res.json({ success: true, messageIds });
    } catch (err) {
      console.error('[POST /api/messages/:contactId/mark-read]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** GET /api/messages/:contactId */
router.get(
  '/:contactId',
  protect,
  [param('contactId').isInt().withMessage('Contact invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.userId;
      const contactId = req.params.contactId;

      const [rows] = await pool.execute(
        `SELECT * FROM direct_messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at ASC`,
        [userId, contactId, contactId, userId]
      );

      await markMessagesAsRead(userId, contactId);

      const [updatedRows] = await pool.execute(
        `SELECT * FROM direct_messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at ASC`,
        [userId, contactId, contactId, userId]
      );

      res.json({
        success: true,
        messages: updatedRows.map(mapMessageRow),
        onlineUsers: getOnlineUsers(),
      });
    } catch (err) {
      console.error('[GET /api/messages/:contactId]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** POST /api/messages */
router.post(
  '/',
  protect,
  [
    body('receiver_id').isInt().withMessage('Destinataire invalide.'),
    body('contenu').trim().notEmpty().withMessage('Le message ne peut pas être vide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const senderId = req.userId;
      const { receiver_id, contenu } = req.body;

      const [result] = await pool.execute(
        `INSERT INTO direct_messages (sender_id, receiver_id, contenu)
         VALUES (?, ?, ?)`,
        [senderId, receiver_id, contenu.trim()]
      );

      const [rows] = await pool.execute(
        'SELECT * FROM direct_messages WHERE id = ?',
        [result.insertId]
      );
      const message = mapMessageRow(rows[0]);

      emitToUser(receiver_id, 'new_message', { message });
      emitToUser(senderId, 'new_message', { message });

      // 🔔 Notifier le destinataire du nouveau message (fire-and-forget)
      const [senderRow] = await pool.execute('SELECT nom_prenom FROM users WHERE id = ?', [senderId]);
      const senderName = senderRow[0]?.nom_prenom || 'Un utilisateur';
      notifService.createNotif({
        userId: receiver_id,
        type: 'new_message',
        title: `Nouveau message de ${senderName}`,
        body: contenu.trim().length > 50 ? `${contenu.trim().substring(0, 50)}...` : contenu.trim(),
        link: '/messages',
        entityType: 'messages',
        entityId: senderId,
      });

      res.status(201).json({ success: true, message });
    } catch (err) {
      console.error('[POST /api/messages]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** PUT /api/messages/:id */
router.put(
  '/:id',
  protect,
  [
    param('id').isInt(),
    body('contenu').trim().notEmpty().withMessage('Le contenu est requis.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute(
        'SELECT * FROM direct_messages WHERE id = ? AND sender_id = ?',
        [id, req.userId]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Message introuvable.' });
      }
      if (existing[0].is_deleted) {
        return res.status(400).json({ success: false, message: 'Message supprimé.' });
      }

      await pool.execute(
        'UPDATE direct_messages SET contenu = ?, is_modified = TRUE WHERE id = ?',
        [req.body.contenu.trim(), id]
      );

      const [rows] = await pool.execute('SELECT * FROM direct_messages WHERE id = ?', [id]);
      const message = mapMessageRow(rows[0]);

      emitToUser(message.receiverId, 'message_updated', { message });
      emitToUser(message.senderId, 'message_updated', { message });

      res.json({ success: true, message });
    } catch (err) {
      console.error('[PUT /api/messages/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** DELETE /api/messages/:id */
router.delete(
  '/:id',
  protect,
  [param('id').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute(
        'SELECT * FROM direct_messages WHERE id = ? AND sender_id = ?',
        [id, req.userId]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Message introuvable.' });
      }

      await pool.execute(
        'UPDATE direct_messages SET is_deleted = TRUE WHERE id = ?',
        [id]
      );

      const [rows] = await pool.execute('SELECT * FROM direct_messages WHERE id = ?', [id]);
      const message = mapMessageRow(rows[0]);

      emitToUser(message.receiverId, 'message_deleted', { message });
      emitToUser(message.senderId, 'message_deleted', { message });

      res.json({ success: true, message });
    } catch (err) {
      console.error('[DELETE /api/messages/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;
