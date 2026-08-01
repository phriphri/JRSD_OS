'use strict';

const express = require('express');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { pool } = require('../config/db');
const notifService = require('../services/notifService');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont autorisées.'));
    }
    cb(null, true);
  },
});

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  const dbName = process.env.DB_NAME || 'jrsd_os';

  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'image_url'`,
    [dbName]
  );
  if (cols.length === 0) {
    await pool.execute(
      'ALTER TABLE projects ADD COLUMN image_url VARCHAR(500) DEFAULT NULL COMMENT \'Chemin photo du projet\''
    );
  }

  const [publicIdCols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'image_public_id'`,
    [dbName]
  );
  if (publicIdCols.length === 0) {
    await pool.execute(
      'ALTER TABLE projects ADD COLUMN image_public_id VARCHAR(255) DEFAULT NULL AFTER image_url'
    );
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INT UNSIGNED NOT NULL,
      user_id    INT UNSIGNED NOT NULL,
      added_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  schemaReady = true;
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

const STATUT_LABELS = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
};

function mapStatutToDb(label) {
  const map = {
    'En attente': 'en_attente',
    'En cours': 'en_cours',
    'Terminé': 'termine',
    en_attente: 'en_attente',
    en_cours: 'en_cours',
    termine: 'termine',
  };
  return map[label] || label;
}

function parseCollaboratorIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
  } catch (_) { /* ignore */ }
  return String(raw)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${base.replace(/\/$/, '')}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

async function uploadProjectImage(file, previousPublicId = null) {
  if (previousPublicId) {
    await deleteFromCloudinary(previousPublicId, 'image');
  }
  const cloudResult = await uploadToCloudinary(file.buffer, {
    folder: 'jrsd_os/projects',
    resource_type: 'image',
    mimetype: file.mimetype,
  });
  return {
    imageUrl: cloudResult.secure_url,
    imagePublicId: cloudResult.public_id,
  };
}

function mapProjectRow(row) {
  const imageUrl = resolveImageUrl(row.image_url);

  return {
    id: row.id,
    name: row.nom,
    description: row.description || '',
    status: STATUT_LABELS[row.statut] || row.statut,
    statut: row.statut,
    startDate: row.date_debut ? String(row.date_debut).slice(0, 10) : null,
    endDate: row.date_fin ? String(row.date_fin).slice(0, 10) : null,
    managerId: row.manager_id,
    managerName: row.manager_name || null,
    managerEmail: row.manager_email || null,
    imageUrl,
    progress: Number(row.progress) || 0,
    taskTotal: Number(row.task_total) || 0,
    taskDone: Number(row.task_done) || 0,
    collaborators: row.collaborators || [],
  };
}

const projectListSql = `
  SELECT p.*,
    u.nom_prenom AS manager_name,
    u.email AS manager_email,
    COALESCE(
      ROUND(100 * SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 0),
      0
    ) AS progress,
    COUNT(t.id) AS task_total,
    SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) AS task_done
  FROM projects p
  LEFT JOIN users u ON u.id = p.manager_id
  LEFT JOIN tasks t ON t.project_id = p.id
`;

async function syncCollaborators(projectId, userIds) {
  await pool.execute('DELETE FROM project_members WHERE project_id = ?', [projectId]);
  const unique = [...new Set(userIds.filter((id) => id && !Number.isNaN(id)))];
  for (const userId of unique) {
    await pool.execute(
      'INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)',
      [projectId, userId]
    );
  }
}

async function fetchCollaborators(projectId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nom_prenom, u.email, u.fonction, u.role
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY u.nom_prenom ASC`,
    [projectId]
  );
  return rows;
}

router.use(async (_req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[projects ensureSchema]', err.message);
    res.status(500).json({ success: false, message: 'Erreur initialisation schéma projets.' });
  }
});

/** GET /api/projects */
router.get('/', protect, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `${projectListSql}
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );

    const projects = rows.map((row) => mapProjectRow({ ...row, collaborators: [] }));
    res.json({ success: true, projects });
  } catch (err) {
    console.error('[GET /api/projects]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/projects/:id */
router.get(
  '/:id',
  protect,
  [param('id').isInt().withMessage('ID invalide.')],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        `${projectListSql}
         WHERE p.id = ?
         GROUP BY p.id`,
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Projet introuvable.' });
      }
      const collaborators = await fetchCollaborators(id);
      res.json({
        success: true,
        project: mapProjectRow({ ...rows[0], collaborators }),
      });
    } catch (err) {
      console.error('[GET /api/projects/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

const projectBodyRules = [
  body('nom').optional().trim().notEmpty().withMessage('Le nom est obligatoire.'),
  body('description').optional().trim(),
  body('date_debut').optional({ values: 'falsy' }).isISO8601().withMessage('Date de début invalide.'),
  body('date_fin').optional({ values: 'falsy' }).isISO8601().withMessage('Date de fin invalide.'),
  body('statut')
    .optional()
    .isIn(['en_attente', 'en_cours', 'termine', 'En attente', 'En cours', 'Terminé'])
    .withMessage('Statut invalide.'),
  body('manager_id').optional({ values: 'null' }).isInt().withMessage('Manager invalide.'),
];

/** POST /api/projects — Admin uniquement */
router.post(
  '/',
  protect,
  adminOnly,
  upload.single('image'),
  projectBodyRules,
  validateRequest,
  async (req, res) => {
    try {
      const nom = req.body.nom?.trim();
      if (!nom) {
        return res.status(422).json({ success: false, message: 'Le nom du projet est obligatoire.' });
      }

      const statut = mapStatutToDb(req.body.statut || 'en_attente');
      let imageUrl = null;
      let imagePublicId = null;
      if (req.file) {
        const uploaded = await uploadProjectImage(req.file);
        imageUrl = uploaded.imageUrl;
        imagePublicId = uploaded.imagePublicId;
      }
      const managerId = req.body.manager_id ? parseInt(req.body.manager_id, 10) : null;

      if (managerId) {
        const [mgr] = await pool.execute(
          `SELECT id FROM users WHERE id = ? AND role = 'manager'`,
          [managerId]
        );
        if (!mgr.length) {
          return res.status(422).json({ success: false, message: 'Manager introuvable ou rôle invalide.' });
        }
      }

      const [result] = await pool.execute(
        `INSERT INTO projects (nom, description, date_debut, date_fin, statut, manager_id, image_url, image_public_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nom,
          req.body.description?.trim() || null,
          req.body.date_debut || null,
          req.body.date_fin || null,
          statut,
          managerId,
          imageUrl,
          imagePublicId,
        ]
      );

      const projectId = result.insertId;
      await syncCollaborators(projectId, parseCollaboratorIds(req.body.collaborator_ids));

      const [rows] = await pool.execute(
        `${projectListSql} WHERE p.id = ? GROUP BY p.id`,
        [projectId]
      );
      const collaborators = await fetchCollaborators(projectId);
      const project = mapProjectRow({ ...rows[0], collaborators });

      // 🔔 Notifier le manager du projet (fire-and-forget)
      if (managerId && managerId !== req.userId) {
        notifService.createNotif({
          userId: managerId,
          type: 'project_created',
          title: `Nouveau projet : ${nom}`,
          body: req.body.description?.trim() || null,
          link: `/projects/${projectId}`,
          entityType: 'projects',
          entityId: projectId,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Projet créé.',
        project,
      });
    } catch (err) {
      console.error('[POST /api/projects]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** PUT /api/projects/:id — Admin uniquement */
router.put(
  '/:id',
  protect,
  adminOnly,
  upload.single('image'),
  [param('id').isInt(), ...projectBodyRules],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Projet introuvable.' });
      }

      const current = existing[0];
      const nom = req.body.nom !== undefined ? req.body.nom.trim() : current.nom;
      const statut = req.body.statut !== undefined
        ? mapStatutToDb(req.body.statut)
        : current.statut;
      const managerId = req.body.manager_id !== undefined
        ? (req.body.manager_id ? parseInt(req.body.manager_id, 10) : null)
        : current.manager_id;

      if (managerId) {
        const [mgr] = await pool.execute(
          `SELECT id FROM users WHERE id = ? AND role = 'manager'`,
          [managerId]
        );
        if (!mgr.length) {
          return res.status(422).json({ success: false, message: 'Manager introuvable ou rôle invalide.' });
        }
      }

      let imageUrl = current.image_url;
      let imagePublicId = current.image_public_id || null;
      if (req.file) {
        const uploaded = await uploadProjectImage(req.file, current.image_public_id);
        imageUrl = uploaded.imageUrl;
        imagePublicId = uploaded.imagePublicId;
      }

      await pool.execute(
        `UPDATE projects SET
          nom = ?, description = ?, date_debut = ?, date_fin = ?,
          statut = ?, manager_id = ?, image_url = ?, image_public_id = ?
         WHERE id = ?`,
        [
          nom,
          req.body.description !== undefined ? (req.body.description?.trim() || null) : current.description,
          req.body.date_debut !== undefined ? (req.body.date_debut || null) : current.date_debut,
          req.body.date_fin !== undefined ? (req.body.date_fin || null) : current.date_fin,
          statut,
          managerId,
          imageUrl,
          imagePublicId,
          id,
        ]
      );

      if (req.body.collaborator_ids !== undefined) {
        await syncCollaborators(id, parseCollaboratorIds(req.body.collaborator_ids));
      }

      const [rows] = await pool.execute(
        `${projectListSql} WHERE p.id = ? GROUP BY p.id`,
        [id]
      );
      const collaborators = await fetchCollaborators(id);
      const updatedProject = mapProjectRow({ ...rows[0], collaborators });

      // 🔔 Notifier tous les membres du projet (fire-and-forget)
      const memberIds = collaborators.map(c => c.id);
      if (managerId && !memberIds.includes(managerId)) memberIds.push(managerId);
      const recipients = memberIds.filter(uid => uid !== req.userId);
      if (recipients.length) {
        notifService.createNotifForMany(recipients, {
          type: 'project_updated',
          title: `Projet mis à jour : ${updatedProject.name}`,
          link: `/projects/${id}`,
          entityType: 'projects',
          entityId: Number(id),
        });
      }

      res.json({
        success: true,
        message: 'Projet mis à jour.',
        project: updatedProject,
      });
    } catch (err) {
      console.error('[PUT /api/projects/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** PUT /api/projects/:id/collaborators — Admin ou Manager du projet */
router.put(
  '/:id/collaborators',
  protect,
  managerOrAdmin,
  [
    param('id').isInt().withMessage('ID invalide.'),
    body('collaborator_ids').custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch (_) {
          return true; // csv string fallback géré par parseCollaboratorIds
        }
      }
      return false;
    }).withMessage('Liste des collaborateurs invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute(
        'SELECT id, manager_id FROM projects WHERE id = ?',
        [id]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Projet introuvable.' });
      }

      const project = existing[0];
      if (req.userRole === 'manager' && Number(project.manager_id) !== Number(req.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez gérer que les collaborateurs de vos projets.',
        });
      }

      await syncCollaborators(id, parseCollaboratorIds(req.body.collaborator_ids));

      const [rows] = await pool.execute(
        `${projectListSql} WHERE p.id = ? GROUP BY p.id`,
        [id]
      );
      const collaborators = await fetchCollaborators(id);

      res.json({
        success: true,
        message: 'Collaborateurs mis à jour.',
        project: mapProjectRow({ ...rows[0], collaborators }),
      });
    } catch (err) {
      console.error('[PUT /api/projects/:id/collaborators]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

/** DELETE /api/projects/:id — Admin uniquement */
router.delete(
  '/:id',
  protect,
  adminOnly,
  [param('id').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Récupérer infos avant suppression pour notifier
      const [projectRows] = await pool.execute(
        'SELECT nom, manager_id, image_public_id FROM projects WHERE id = ?',
        [id]
      );
      if (!projectRows.length) {
        return res.status(404).json({ success: false, message: 'Projet introuvable.' });
      }
      const deletedName = projectRows[0].nom;
      const deletedManagerId = projectRows[0].manager_id;
      if (projectRows[0].image_public_id) {
        await deleteFromCloudinary(projectRows[0].image_public_id, 'image');
      }
      const [memberRows] = await pool.execute(
        'SELECT user_id FROM project_members WHERE project_id = ?',
        [id]
      );
      const memberIds = memberRows.map(r => r.user_id);
      if (deletedManagerId && !memberIds.includes(deletedManagerId)) {
        memberIds.push(deletedManagerId);
      }

      const [result] = await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Projet introuvable.' });
      }

      // 🔔 Notifier les membres (fire-and-forget)
      const recipients = memberIds.filter(uid => uid !== req.userId);
      if (recipients.length) {
        notifService.createNotifForMany(recipients, {
          type: 'project_deleted',
          title: `Projet supprimé : ${deletedName}`,
          link: '/projects',
          entityType: 'projects',
          entityId: Number(id),
        });
      }

      res.json({ success: true, message: 'Projet supprimé.' });
    } catch (err) {
      console.error('[DELETE /api/projects/:id]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
