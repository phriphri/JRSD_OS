'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');
const { generateInvitation } = require('../controllers/authController');

const router = express.Router();

let schemaReady = false;

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

async function ensureSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';

  // Ensure users.status exists
  {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'statut'`,
      [dbName]
    );
    if (cols.length === 0) {
      await pool.execute(`
        ALTER TABLE users
          ADD COLUMN statut ENUM('actif', 'suspendu') NOT NULL DEFAULT 'actif'
          COMMENT 'Statut du compte : actif | suspendu'
      `);
    }
  }

  // Ensure teams table exists (for join)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
      nom         VARCHAR(150)   NOT NULL,
      description TEXT           DEFAULT NULL,
      created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Équipes de travail'
  `);

  // Ensure users.team_id exists
  {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'team_id'`,
      [dbName]
    );
    if (cols.length === 0) {
      await pool.execute(`
        ALTER TABLE users
          ADD COLUMN team_id INT UNSIGNED DEFAULT NULL,
          ADD INDEX idx_users_team (team_id),
          ADD CONSTRAINT fk_users_team
            FOREIGN KEY (team_id) REFERENCES teams(id)
            ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }
  }

  // Ensure tasks/projects exist (progress calculation relies on them)
  // If they don't exist, subsequent queries will fail and we surface a clear 500.

  schemaReady = true;
}

router.use(async (_req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[agents ensureSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur initialisation schéma agents.' });
  }
});

function splitName(nom_prenom) {
  const raw = (nom_prenom || '').trim();
  const parts = raw.split(' ').filter(Boolean);
  const prenom = parts.shift() || '';
  const nom = parts.join(' ') || '';
  return { prenom, nom };
}

async function fetchActiveProjectsForUser(userId) {
  // Deprecated: kept to avoid breaking history (not used anymore).
  // eslint-disable-next-line no-unused-vars
  return [];
}

/** GET /api/admin/users — Admin */
router.get('/users', protect, adminOnly, async (_req, res) => {
  try {
    const [users] = await pool.execute(
      `
      SELECT
        u.id,
        u.nom_prenom,
        u.email,
        u.fonction,
        u.role,
        u.statut,
        u.team_id,
        t.nom AS team_nom
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      ORDER BY u.created_at DESC
      `
    );

    const [activeProjects] = await pool.execute(
      `
      SELECT p.id,
             p.nom,
             p.statut,
             p.date_debut,
             p.date_fin,
             p.manager_id,
             ROUND(
               100 * SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END)
               / NULLIF(COUNT(t.id), 0),
               0
             ) AS progress
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.statut <> 'termine'
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `
    );

    const activeProjectsById = new Map(
      activeProjects.map((p) => [
        Number(p.id),
        {
          id: p.id,
          nom: p.nom,
          statut: p.statut,
          date_debut: p.date_debut ? String(p.date_debut).slice(0, 10) : null,
          date_fin: p.date_fin ? String(p.date_fin).slice(0, 10) : null,
          progress: Number(p.progress) || 0,
        },
      ])
    );

    const [userProjectLinks] = await pool.execute(
      `
      SELECT p.manager_id AS user_id, p.id AS project_id
      FROM projects p
      WHERE p.statut <> 'termine' AND p.manager_id IS NOT NULL
      UNION
      SELECT t.assignee_id AS user_id, t.project_id AS project_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.statut <> 'termine' AND t.assignee_id IS NOT NULL
      `
    );

    const projectIdsByUser = new Map();
    for (const link of userProjectLinks) {
      const uid = Number(link.user_id);
      const pid = Number(link.project_id);
      if (!projectIdsByUser.has(uid)) projectIdsByUser.set(uid, new Set());
      projectIdsByUser.get(uid).add(pid);
    }

    const results = users.map((u) => {
      const { prenom, nom } = splitName(u.nom_prenom);
      const ids = projectIdsByUser.get(Number(u.id)) || new Set();
      const activeProjects = [...ids]
        .map((pid) => activeProjectsById.get(pid))
        .filter(Boolean)
        .sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));

      return {
        id: u.id,
        nom_prenom: u.nom_prenom,
        prenom,
        nom,
        email: u.email,
        fonction: u.fonction,
        role: u.role,
        statut: u.statut,
        team: u.team_id ? { id: u.team_id, nom: u.team_nom } : null,
        activeProjects,
      };
    });

    res.json({ success: true, users: results });
  } catch (err) {
    console.error('[GET /api/admin/users]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** PUT /api/admin/users/:id/status — Admin */
router.put(
  '/users/:id/status',
  protect,
  adminOnly,
  [
    param('id').isInt().withMessage('ID invalide.'),
    body('role').optional().isIn(['admin', 'manager', 'employe']).withMessage('Rôle invalide.'),
    body('statut').optional().isIn(['actif', 'suspendu']).withMessage('Statut invalide.'),
    body('status').optional().isIn(['actif', 'suspendu']).withMessage('Statut invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = req.params.id;
      const role = req.body.role;
      const statut = req.body.statut || req.body.status;

      if (!role && !statut) {
        return res.status(422).json({ success: false, message: 'role ou statut est requis.' });
      }

      const sets = [];
      const params = [];
      if (role) {
        sets.push('role = ?');
        params.push(role);
      }
      if (statut) {
        sets.push('statut = ?');
        params.push(statut);
      }
      params.push(id);

      const [result] = await pool.execute(
        `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
        params
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
      }

      const [rows] = await pool.execute(
        `SELECT id, nom_prenom, email, fonction, role, statut, team_id FROM users WHERE id = ?`,
        [id]
      );
      const updated = rows[0] || null;

      res.json({ success: true, message: 'Mise à jour effectuée.', user: updated });
    } catch (err) {
      console.error('[PUT /api/admin/users/:id/status]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** POST /api/admin/invitation — Admin wrapper around authController.generateInvitation */
router.post('/invitation', protect, adminOnly, generateInvitation);

module.exports = router;

