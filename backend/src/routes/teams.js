'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');

const router = express.Router();

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
      nom         VARCHAR(150)   NOT NULL,
      description TEXT           DEFAULT NULL,
      created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_teams_nom (nom)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Équipes de travail'
  `);

  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'team_id'`,
    [dbName]
  );
  if (cols.length === 0) {
    await pool.execute(`
      ALTER TABLE users
        ADD COLUMN team_id INT UNSIGNED DEFAULT NULL COMMENT 'FK vers teams.id',
        ADD INDEX idx_users_team (team_id),
        ADD CONSTRAINT fk_users_team
          FOREIGN KEY (team_id) REFERENCES teams(id)
          ON DELETE SET NULL ON UPDATE CASCADE
    `);
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

function mapTeamRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    description: row.description || '',
    memberCount: Number(row.member_count) || 0,
    createdAt: row.created_at,
  };
}

async function syncTeamMembers(teamId, memberIds) {
  const ids = [...new Set((memberIds || []).map(Number).filter((n) => !Number.isNaN(n) && n > 0))];
  await pool.execute('UPDATE users SET team_id = NULL WHERE team_id = ?', [teamId]);
  for (const userId of ids) {
    await pool.execute('UPDATE users SET team_id = ? WHERE id = ?', [teamId, userId]);
  }
  return ids.length;
}

router.use(async (_req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[teams ensureSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur initialisation schéma équipes.' });
  }
});

/** GET /api/teams */
router.get('/', protect, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, COUNT(u.id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.team_id = t.id
       GROUP BY t.id
       ORDER BY t.nom ASC`
    );
    res.json({ success: true, teams: rows.map(mapTeamRow) });
  } catch (err) {
    console.error('[GET /api/teams]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/teams/:id/available-users — Utilisateurs assignables (hors équipe courante) */
router.get(
  '/:id/available-users',
  protect,
  adminOnly,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        `SELECT id, nom_prenom, email, fonction, role, team_id
         FROM users
         WHERE team_id IS NULL OR team_id != ?
         ORDER BY nom_prenom ASC`,
        [id]
      );
      res.json({ success: true, users: rows });
    } catch (err) {
      console.error('[GET /api/teams/:id/available-users]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** GET /api/teams/:id/members */
router.get(
  '/:id/members',
  protect,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [teamRows] = await pool.execute('SELECT id, nom, description FROM teams WHERE id = ?', [id]);
      if (!teamRows.length) {
        return res.status(404).json({ success: false, message: 'Équipe introuvable.' });
      }

      const [members] = await pool.execute(
        `SELECT id, nom_prenom, email, fonction, role, team_id, created_at
         FROM users WHERE team_id = ?
         ORDER BY nom_prenom ASC`,
        [id]
      );

      res.json({
        success: true,
        team: {
          id: teamRows[0].id,
          nom: teamRows[0].nom,
          description: teamRows[0].description || '',
        },
        members,
      });
    } catch (err) {
      console.error('[GET /api/teams/:id/members]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

const teamBodyRules = [
  body('nom').trim().notEmpty().withMessage('Le nom est obligatoire.').isLength({ max: 150 }),
  body('description').optional().trim(),
  body('member_ids').optional().isArray().withMessage('member_ids doit être un tableau.'),
];

/** POST /api/teams/:id/members — Ajouter un membre (Admin) */
router.post(
  '/:id/members',
  protect,
  adminOnly,
  [
    param('id').isInt().withMessage('ID équipe invalide.'),
    body('user_id').isInt().withMessage('ID utilisateur invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.body.user_id;

      const [teamRows] = await pool.execute('SELECT id FROM teams WHERE id = ?', [teamId]);
      if (!teamRows.length) {
        return res.status(404).json({ success: false, message: 'Équipe introuvable.' });
      }

      const [userRows] = await pool.execute(
        'SELECT id, nom_prenom FROM users WHERE id = ?',
        [userId]
      );
      if (!userRows.length) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
      }

      await pool.execute('UPDATE users SET team_id = ? WHERE id = ?', [teamId, userId]);

      const [members] = await pool.execute(
        `SELECT id, nom_prenom, email, fonction, role, team_id, created_at
         FROM users WHERE team_id = ? ORDER BY nom_prenom ASC`,
        [teamId]
      );

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS member_count FROM users WHERE team_id = ?`,
        [teamId]
      );

      res.json({
        success: true,
        message: `${userRows[0].nom_prenom} ajouté à l'équipe.`,
        members,
        memberCount: Number(countRows[0].member_count),
      });
    } catch (err) {
      console.error('[POST /api/teams/:id/members]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** DELETE /api/teams/:id/members/:userId — Retirer un membre (Admin) */
router.delete(
  '/:id/members/:userId',
  protect,
  adminOnly,
  [
    param('id').isInt().withMessage('ID équipe invalide.'),
    param('userId').isInt().withMessage('ID utilisateur invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: teamId, userId } = req.params;

      const [result] = await pool.execute(
        'UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?',
        [userId, teamId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Membre introuvable dans cette équipe.' });
      }

      const [members] = await pool.execute(
        `SELECT id, nom_prenom, email, fonction, role, team_id, created_at
         FROM users WHERE team_id = ? ORDER BY nom_prenom ASC`,
        [teamId]
      );

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS member_count FROM users WHERE team_id = ?`,
        [teamId]
      );

      res.json({
        success: true,
        message: 'Membre retiré de l\'équipe.',
        members,
        memberCount: Number(countRows[0].member_count),
      });
    } catch (err) {
      console.error('[DELETE /api/teams/:id/members/:userId]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** POST /api/teams — Admin */
router.post('/', protect, adminOnly, teamBodyRules, validateRequest, async (req, res) => {
  try {
    const { nom, description, member_ids } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO teams (nom, description) VALUES (?, ?)',
      [nom.trim(), description?.trim() || null]
    );
    const teamId = result.insertId;
    if (member_ids?.length) {
      await syncTeamMembers(teamId, member_ids);
    }
    const [rows] = await pool.execute(
      `SELECT t.*, COUNT(u.id) AS member_count
       FROM teams t LEFT JOIN users u ON u.team_id = t.id
       WHERE t.id = ? GROUP BY t.id`,
      [teamId]
    );
    res.status(201).json({ success: true, message: 'Équipe créée.', team: mapTeamRow(rows[0]) });
  } catch (err) {
    console.error('[POST /api/teams]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** PUT /api/teams/:id — Admin */
router.put(
  '/:id',
  protect,
  adminOnly,
  [param('id').isInt(), ...teamBodyRules],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nom, description, member_ids } = req.body;
      const [result] = await pool.execute(
        'UPDATE teams SET nom = ?, description = ? WHERE id = ?',
        [nom.trim(), description?.trim() || null, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Équipe introuvable.' });
      }
      if (member_ids !== undefined) {
        await syncTeamMembers(id, member_ids);
      }
      const [rows] = await pool.execute(
        `SELECT t.*, COUNT(u.id) AS member_count
         FROM teams t LEFT JOIN users u ON u.team_id = t.id
         WHERE t.id = ? GROUP BY t.id`,
        [id]
      );
      res.json({ success: true, message: 'Équipe mise à jour.', team: mapTeamRow(rows[0]) });
    } catch (err) {
      console.error('[PUT /api/teams/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** DELETE /api/teams/:id — Admin */
router.delete(
  '/:id',
  protect,
  adminOnly,
  [param('id').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await pool.execute('DELETE FROM teams WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Équipe introuvable.' });
      }
      res.json({ success: true, message: 'Équipe supprimée.' });
    } catch (err) {
      console.error('[DELETE /api/teams/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;
