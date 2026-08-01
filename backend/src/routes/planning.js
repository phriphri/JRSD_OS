// ============================================================
//  J-RSD OS — Routes API Planning
//  Fichier : backend/src/routes/planning.js
// ============================================================

'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');
const notifService = require('../services/notifService');

/**
 * Récupère tous les user_id concernés par un événement planning.
 * target_type='all'  → tous les utilisateurs
 * target_type='team' → membres de l'équipe target_team_id
 */
async function getTargetUserIds(targetType, targetTeamId) {
  try {
    if (targetType === 'all') {
      const [rows] = await pool.execute('SELECT id FROM users WHERE status = \'actif\' OR status IS NULL');
      return rows.map(r => r.id);
    }
    if (targetType === 'team' && targetTeamId) {
      const [rows] = await pool.execute(
        'SELECT id FROM users WHERE team_id = ?',
        [targetTeamId]
      );
      return rows.map(r => r.id);
    }
  } catch (err) {
    console.error('[planning getTargetUserIds]', err.message);
  }
  return [];
}

// GET /api/planning/my-schedule
// Renvoie les événements pour l'utilisateur connecté
router.get('/my-schedule', protect, async (req, res) => {
  try {
    const userRole = req.userRole;

    // Pour l'Admin, on renvoie tout sans filtre
    if (userRole === 'admin') {
      const [events] = await pool.execute(
        'SELECT * FROM planning_events ORDER BY start_time ASC'
      );
      return res.json({ success: true, events });
    }

    const [userRows] = await pool.execute(
      'SELECT team_id FROM users WHERE id = ? LIMIT 1',
      [String(req.userId)]
    );

    if (userRows.length > 0 && userRows[0].team_id) {
      const teamId = userRows[0].team_id;
      const [events] = await pool.execute(
        `SELECT * FROM planning_events
         WHERE target_type = 'all'
            OR (target_type = 'team' AND target_team_id = ?)
         ORDER BY start_time ASC`,
        [String(teamId)]
      );
      return res.json({ success: true, events });
    }

    // Utilisateur sans équipe : uniquement les événements globaux
    const [events] = await pool.execute(
      `SELECT * FROM planning_events WHERE target_type = 'all' ORDER BY start_time ASC`
    );
    res.json({ success: true, events });
  } catch (err) {
    console.error('[Planning GET /my-schedule] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/planning
// Création d'un événement (Admin uniquement)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, start_time, end_time, target_type, target_team_id, icon } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Titre et dates obligatoires.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO planning_events (title, description, start_time, end_time, target_type, target_team_id, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, start_time, end_time, target_type || 'all', target_team_id || null, icon || null]
    );

    const [newEvent] = await pool.execute('SELECT * FROM planning_events WHERE id = ?', [String(result.insertId)]);
    const event = newEvent[0];

    // 🔔 Notifier les utilisateurs ciblés (fire-and-forget)
    getTargetUserIds(event.target_type, event.target_team_id).then(userIds => {
      const recipients = userIds.filter(uid => uid !== req.userId);
      if (recipients.length) {
        notifService.createNotifForMany(recipients, {
          type: 'planning_created',
          title: `Nouvel événement : ${event.title}`,
          body: event.description || null,
          link: '/planning',
          entityType: 'planning',
          entityId: event.id,
        });
      }
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('[Planning POST] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// PUT /api/planning/:id
// Modification d'un événement (Admin uniquement)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_time, end_time, target_type, target_team_id, icon } = req.body;

    const [event] = await pool.execute('SELECT * FROM planning_events WHERE id = ?', [id]);
    if (event.length === 0) {
      return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    }

    await pool.execute(
      `UPDATE planning_events 
       SET title = COALESCE(?, title),
           description = ?,
           start_time = COALESCE(?, start_time),
           end_time = COALESCE(?, end_time),
           target_type = COALESCE(?, target_type),
           target_team_id = ?,
           icon = ?
       WHERE id = ?`,
      [title, description, start_time, end_time, target_type, target_team_id || null, icon, id]
    );

    const [updatedEvent] = await pool.execute('SELECT * FROM planning_events WHERE id = ?', [id]);
    const event = updatedEvent[0];

    // 🔔 Notifier les utilisateurs ciblés (fire-and-forget)
    getTargetUserIds(event.target_type, event.target_team_id).then(userIds => {
      const recipients = userIds.filter(uid => uid !== req.userId);
      if (recipients.length) {
        notifService.createNotifForMany(recipients, {
          type: 'planning_updated',
          title: `Événement modifié : ${event.title}`,
          link: '/planning',
          entityType: 'planning',
          entityId: Number(id),
        });
      }
    });

    res.json({ success: true, event });
  } catch (err) {
    console.error('[Planning PUT] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/planning/:id
// Suppression d'un événement (Admin uniquement)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'événement avant suppression
    const [eventRows] = await pool.execute('SELECT * FROM planning_events WHERE id = ?', [id]);
    const deletedEvent = eventRows[0];

    const [result] = await pool.execute('DELETE FROM planning_events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    }

    // 🔔 Notifier (fire-and-forget)
    if (deletedEvent) {
      getTargetUserIds(deletedEvent.target_type, deletedEvent.target_team_id).then(userIds => {
        const recipients = userIds.filter(uid => uid !== req.userId);
        if (recipients.length) {
          notifService.createNotifForMany(recipients, {
            type: 'planning_deleted',
            title: `Événement supprimé : ${deletedEvent.title}`,
            link: '/planning',
            entityType: 'planning',
            entityId: Number(id),
          });
        }
      });
    }

    res.json({ success: true, message: 'Événement supprimé.' });
  } catch (err) {
    console.error('[Planning DELETE] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
