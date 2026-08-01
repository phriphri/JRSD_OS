'use strict';

/**
 * notifService.js — Service centralisé de création de notifications automatiques
 *
 * Utilisé en fire-and-forget depuis les routes (tasks, projects, planning, messages).
 * Chaque appel est non-bloquant : les erreurs sont loguées sans remonter.
 *
 * Anti-doublons : UNIQUE KEY (user_id, entity_type, entity_id, type) en DB.
 * Si une notif identique existe déjà, on la rafraîchit (is_read=0, updated date).
 */

const { pool } = require('../config/db');
const { emitToUser } = require('../socket');

/**
 * Crée (ou rafraîchit) une notification pour un utilisateur.
 *
 * @param {object} opts
 * @param {number}  opts.userId      - ID du destinataire
 * @param {string}  opts.type        - Type (ex: 'task_assigned', 'project_updated')
 * @param {string}  opts.title       - Titre court
 * @param {string}  [opts.body]      - Texte détaillé (optionnel)
 * @param {string}  [opts.link]      - Route frontend (ex: '/tasks', '/projects/5')
 * @param {string}  [opts.entityType]- Type d'entité ('tasks', 'projects', 'planning', 'messages')
 * @param {number}  [opts.entityId]  - ID de l'entité concernée
 */
async function createNotif({ userId, type, title, body = null, link = null, entityType = null, entityId = null }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO user_notifications
         (user_id, type, title, body, link, entity_type, entity_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         title      = VALUES(title),
         body       = VALUES(body),
         link       = VALUES(link),
         is_read    = 0,
         created_at = CURRENT_TIMESTAMP`,
      [userId, type, title, body, link, entityType, entityId]
    );

    // Récupérer la notif insérée/mise à jour pour l'envoyer via socket
    const insertId = result.insertId > 0 ? result.insertId : null;
    if (insertId) {
      const [rows] = await pool.execute(
        'SELECT * FROM user_notifications WHERE id = ?',
        [insertId]
      );
      if (rows.length) {
        emitToUser(userId, 'notification', rows[0]);
      }
    } else {
      // Mise à jour (ON DUPLICATE KEY) → récupérer par clé unique
      const [rows] = await pool.execute(
        `SELECT * FROM user_notifications
         WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND type = ?`,
        [userId, entityType, entityId, type]
      );
      if (rows.length) {
        emitToUser(userId, 'notification', rows[0]);
      }
    }
  } catch (err) {
    // Fire-and-forget : on logue sans bloquer la réponse principale
    console.error(`[notifService] Erreur pour userId=${userId} type=${type}:`, err.message);
  }
}

/**
 * Crée la même notification pour plusieurs utilisateurs en parallèle.
 *
 * @param {number[]} userIds
 * @param {object}   opts - mêmes paramètres que createNotif (sans userId)
 */
async function createNotifForMany(userIds, opts) {
  if (!userIds || !userIds.length) return;
  await Promise.allSettled(
    userIds.map((uid) => createNotif({ ...opts, userId: uid }))
  );
}

module.exports = { createNotif, createNotifForMany };
