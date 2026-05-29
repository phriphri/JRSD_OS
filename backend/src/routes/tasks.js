'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { pool } = require('../config/db');

const router = express.Router();

const VALID_STATUTS = ['a_faire', 'en_cours', 'bloque', 'termine'];

const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire' },
  { id: 'en_cours', title: 'En cours' },
  { id: 'bloque', title: 'Bloqué' },
  { id: 'termine', title: 'Terminé' },
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

function managerOnly(req, res, next) {
  if (req.userRole !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux managers.',
    });
  }
  next();
}

/** @returns {Date|null} */
function parseDeadlineEnd(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Métriques temporelles + progression auto (en_cours) + couleur d'urgence.
 * total_time / remaining_time en millisecondes.
 */
function computeTimeMetrics(row) {
  const deadline = row.deadline ? String(row.deadline).slice(0, 10) : null;
  const createdAt = row.created_at ? new Date(row.created_at) : null;
  const deadlineEnd = parseDeadlineEnd(row.deadline);
  const now = new Date();

  let totalTime = null;
  let remainingTime = null;
  let timeRatio = null;
  let progressPercentage = null;
  let urgencyColor = 'green';

  if (createdAt && deadlineEnd && !Number.isNaN(createdAt.getTime())) {
    totalTime = deadlineEnd.getTime() - createdAt.getTime();
    remainingTime = deadlineEnd.getTime() - now.getTime();

    if (totalTime > 0) {
      timeRatio = (remainingTime / totalTime) * 100;
    } else {
      timeRatio = remainingTime > 0 ? 100 : 0;
    }

    if (timeRatio > 50) {
      urgencyColor = 'green';
    } else if (timeRatio >= 25) {
      urgencyColor = 'yellow';
    } else {
      urgencyColor = 'red';
    }

    if (row.statut === 'en_cours' && timeRatio !== null) {
      if (timeRatio > 50) {
        progressPercentage = Math.round(50 + ((timeRatio - 50) / 50) * 20);
      } else {
        progressPercentage = Math.round((timeRatio / 50) * 50);
      }
      progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    }
  }

  return {
    totalTime,
    remainingTime,
    timeRatio: timeRatio !== null ? Math.round(timeRatio * 100) / 100 : null,
    progressPercentage,
    urgencyColor,
    deadline,
    createdAt: row.created_at,
  };
}

function mapTaskRow(row) {
  const metrics = computeTimeMetrics(row);
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name || null,
    title: row.titre,
    description: row.description || '',
    statut: row.statut,
    status: row.statut,
    priority: row.priorite,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name || null,
    deadline: metrics.deadline,
    dueDate: metrics.deadline,
    createdAt: metrics.createdAt,
    totalTime: metrics.totalTime,
    remainingTime: metrics.remainingTime,
    timeRatio: metrics.timeRatio,
    progressPercentage: metrics.progressPercentage,
    urgencyColor: metrics.urgencyColor,
    // Alias snake_case pour intégrations explicites
    total_time: metrics.totalTime,
    remaining_time: metrics.remainingTime,
    time_ratio: metrics.timeRatio,
    progress_percentage: metrics.progressPercentage,
    urgency_color: metrics.urgencyColor,
  };
}

function structureKanban(tasks) {
  const columns = {
    a_faire: [],
    en_cours: [],
    bloque: [],
    termine: [],
  };
  for (const task of tasks) {
    const key = VALID_STATUTS.includes(task.statut) ? task.statut : 'a_faire';
    columns[key].push(task);
  }
  return {
    columns,
    columnMeta: KANBAN_COLUMNS,
    total: tasks.length,
  };
}

const taskSelectSql = `
  SELECT t.*, p.nom AS project_name, u.nom_prenom AS assignee_name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

const taskOrderSql = `
  ORDER BY
    FIELD(t.statut, 'a_faire', 'en_cours', 'bloque', 'termine'),
    t.deadline IS NULL,
    t.deadline ASC,
    t.created_at DESC
`;

async function fetchTasksForUser(userId) {
  const [rows] = await pool.execute(
    `${taskSelectSql} WHERE t.assignee_id = ? ${taskOrderSql}`,
    [userId]
  );
  return rows.map(mapTaskRow);
}

/** Vérifie qu'un manager peut assigner un utilisateur sur un projet qu'il gère */
async function canManagerAssign(connection, managerId, projectId, assigneeId) {
  const [projects] = await connection.execute(
    'SELECT id FROM projects WHERE id = ? AND manager_id = ?',
    [projectId, managerId]
  );
  if (!projects.length) {
    return { ok: false, status: 403, message: 'Vous ne gérez pas ce projet.' };
  }

  const [assignee] = await connection.execute(
    'SELECT id FROM users WHERE id = ?',
    [assigneeId]
  );
  if (!assignee.length) {
    return { ok: false, status: 422, message: 'Utilisateur assigné introuvable.' };
  }

  const [inProject] = await connection.execute(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
    [projectId, assigneeId]
  );
  if (inProject.length) {
    return { ok: true };
  }

  const [managerRow] = await connection.execute(
    'SELECT team_id FROM users WHERE id = ?',
    [managerId]
  );
  const managerTeamId = managerRow[0]?.team_id;
  if (managerTeamId) {
    const [inTeam] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND team_id = ?',
      [assigneeId, managerTeamId]
    );
    if (inTeam.length) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    status: 422,
    message: 'Assignation refusée : l\'utilisateur doit être membre de votre équipe ou collaborateur du projet.',
  };
}

/** GET /api/tasks/my-list — Liste simple des tâches de l'utilisateur connecté */
router.get('/my-list', protect, async (req, res) => {
  try {
    const tasks = await fetchTasksForUser(req.userId);
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('[GET /api/tasks/my-list]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/tasks/my-tasks — Alias rétrocompatible */
router.get('/my-tasks', protect, async (req, res) => {
  try {
    const tasks = await fetchTasksForUser(req.userId);
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('[GET /api/tasks/my-tasks]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/tasks/kanban/global — Toutes les tâches (Admin) */
router.get('/kanban/global', protect, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`${taskSelectSql} ${taskOrderSql}`);
    const tasks = rows.map(mapTaskRow);
    res.json({
      success: true,
      kanban: structureKanban(tasks),
      tasks,
    });
  } catch (err) {
    console.error('[GET /api/tasks/kanban/global]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** GET /api/tasks/kanban/team — Tâches du manager + équipe + projets gérés */
router.get('/kanban/team', protect, managerOnly, async (req, res) => {
  try {
    const managerId = req.userId;
    // Inclut : ses propres tâches + tâches des membres de son équipe + tâches dans ses projets
    const [rows] = await pool.execute(
      `${taskSelectSql}
       WHERE t.assignee_id = ?
          OR t.project_id IN (SELECT id FROM projects WHERE manager_id = ?)
          OR t.assignee_id IN (
            SELECT u.id FROM users u
            INNER JOIN users m ON m.id = ? AND m.team_id IS NOT NULL AND u.team_id = m.team_id
          )
       ${taskOrderSql}`,
      [managerId, managerId, managerId]
    );
    const tasks = rows.map(mapTaskRow);
    res.json({
      success: true,
      kanban: structureKanban(tasks),
      tasks,
    });
  } catch (err) {
    console.error('[GET /api/tasks/kanban/team]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** POST /api/tasks — Création (Manager / Admin) */
router.post(
  '/',
  protect,
  managerOrAdmin,
  [
    body('project_id').optional({ nullable: true }).isInt().withMessage('Projet invalide.'),
    body('assignee_id').isInt().withMessage('Assigné invalide.'),
    body('titre').trim().notEmpty().withMessage('Le titre est obligatoire.'),
    body('description').optional().trim(),
    body('deadline').optional({ values: 'falsy' }).isISO8601().withMessage('Deadline invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const projectId = req.body.project_id ? parseInt(req.body.project_id, 10) : null;
      const assigneeId = parseInt(req.body.assignee_id, 10);

      // Admin can create tasks without project (Hors projet)
      if (projectId !== null) {
        const [projects] = await connection.execute(
          'SELECT id, manager_id FROM projects WHERE id = ?',
          [projectId]
        );
        if (!projects.length) {
          await connection.rollback();
          return res.status(404).json({ success: false, message: 'Projet introuvable.' });
        }

        if (req.userRole === 'manager') {
          const check = await canManagerAssign(connection, req.userId, projectId, assigneeId);
          if (!check.ok) {
            await connection.rollback();
            return res.status(check.status).json({ success: false, message: check.message });
          }
        } else if (req.userRole === 'admin') {
          const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [assigneeId]);
          if (!users.length) {
            await connection.rollback();
            return res.status(422).json({ success: false, message: 'Utilisateur assigné introuvable.' });
          }
        }
      } else if (req.userRole === 'admin') {
        // Admin creating task without project - just verify assignee exists
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [assigneeId]);
        if (!users.length) {
          await connection.rollback();
          return res.status(422).json({ success: false, message: 'Utilisateur assigné introuvable.' });
        }
      } else {
        // Manager cannot create tasks without project
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Les managers doivent assigner une tâche à un projet.' });
      }

      const [result] = await connection.execute(
        `INSERT INTO tasks (project_id, titre, description, statut, assignee_id, deadline)
         VALUES (?, ?, ?, 'a_faire', ?, ?)`,
        [
          projectId,
          req.body.titre.trim(),
          req.body.description?.trim() || null,
          assigneeId,
          req.body.deadline || null,
        ]
      );

      await connection.commit();

      const [rows] = await pool.execute(`${taskSelectSql} WHERE t.id = ?`, [result.insertId]);
      res.status(201).json({ success: true, message: 'Tâche créée.', task: mapTaskRow(rows[0]) });
    } catch (err) {
      await connection.rollback();
      console.error('[POST /api/tasks]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    } finally {
      connection.release();
    }
  }
);

/** PUT /api/tasks/:id/status — Mise à jour du statut (assigné, manager de l'équipe/projet, admin) */
router.put(
  '/:id/status',
  protect,
  [
    param('id').isInt().withMessage('ID invalide.'),
    body('statut').isIn(VALID_STATUTS).withMessage('Statut invalide.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute(
        `SELECT t.id, t.assignee_id, t.project_id,
                p.manager_id,
                u.team_id AS assignee_team_id
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.id = ?`,
        [id]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Tâche introuvable.' });
      }

      const task = existing[0];
      const role = req.userRole;

      // Admin : accès total
      if (role === 'admin') {
        // OK
      } else if (role === 'manager') {
        // Manager : peut déplacer les tâches de son projet OU de son équipe
        const isProjectManager = task.manager_id === req.userId;
        let isTeamManager = false;
        if (!isProjectManager) {
          const [managerRow] = await pool.execute(
            'SELECT team_id FROM users WHERE id = ?', [req.userId]
          );
          const managerTeamId = managerRow[0]?.team_id;
          isTeamManager = managerTeamId && task.assignee_team_id === managerTeamId;
        }
        if (!isProjectManager && !isTeamManager) {
          return res.status(403).json({
            success: false,
            message: 'Vous ne pouvez déplacer que les tâches de votre équipe ou de vos projets.',
          });
        }
      } else {
        // Employé : uniquement ses propres tâches
        if (task.assignee_id !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'Seul l\'assigné peut modifier le statut de cette tâche.',
          });
        }
      }

      await pool.execute('UPDATE tasks SET statut = ? WHERE id = ?', [req.body.statut, id]);

      const [rows] = await pool.execute(`${taskSelectSql} WHERE t.id = ?`, [id]);
      res.json({ success: true, message: 'Statut mis à jour.', task: mapTaskRow(rows[0]) });
    } catch (err) {
      console.error('[PUT /api/tasks/:id/status]', err.message);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;
