'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Retourne les KPIs filtrés selon le rôle de l'utilisateur connecté.
 *
 * Admin   → Vue globale : tous les projets, équipes, agents, tâches
 * Manager → Vue équipe  : projets gérés + membres de son équipe
 * Employé → Vue perso   : uniquement ses tâches
 */
router.get('/stats', protect, async (req, res) => {
  const userId = req.userId;
  const role = req.userRole; // 'admin' | 'manager' | 'employe'

  try {
    // ─────────────────────────────────────────────────────────────────────
    // ADMIN — Vue globale
    // ─────────────────────────────────────────────────────────────────────
    if (role === 'admin') {
      // 1. Projets : total, en_cours, terminés
      const [projRows] = await pool.execute(
        `SELECT statut, COUNT(*) AS cnt FROM projects GROUP BY statut`
      );
      const projets = { total: 0, en_cours: 0, termine: 0, en_attente: 0 };
      projRows.forEach(r => {
        projets[r.statut] = r.cnt;
        projets.total += r.cnt;
      });

      // 2. Agents inscrits (tous les utilisateurs non supprimés)
      const [[agentsRow]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM users WHERE statut != 'suspendu'`
      );
      const nb_agents = agentsRow.cnt;

      // 3. Nombre d'équipes
      const [[teamsRow]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM teams`
      );
      const nb_equipes = teamsRow.cnt;

      // 4. Tâches par statut (global)
      const [tachesRows] = await pool.execute(
        `SELECT statut, COUNT(*) AS cnt FROM tasks GROUP BY statut`
      );
      const taches = { total: 0, a_faire: 0, en_cours: 0, bloque: 0, termine: 0 };
      tachesRows.forEach(r => {
        taches[r.statut] = r.cnt;
        taches.total += r.cnt;
      });

      // 5. Prochains événements planning (≥ aujourd'hui, tous types)
      const [eventsRows] = await pool.execute(
        `SELECT e.id, e.title, e.start_time, e.target_type, e.target_team_id
         FROM planning_events e
         WHERE e.start_time >= NOW()
         ORDER BY e.start_time ASC
         LIMIT 10`
      );

      // 6. Alertes : tâches urgentes (<= 3 jours) + projets urgents
      const [urgentTasks] = await pool.execute(
        `SELECT t.id, t.titre, t.deadline, u.nom_prenom AS assignee_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.statut != 'termine'
           AND t.deadline IS NOT NULL
           AND t.deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
      );
      const [urgentProjects] = await pool.execute(
        `SELECT id, nom, date_fin FROM projects
         WHERE statut != 'termine'
           AND date_fin IS NOT NULL
           AND date_fin <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
      );

      return res.json({
        success: true,
        role: 'admin',
        stats: {
          projets,
          nb_agents,
          nb_equipes,
          taches,
          upcoming_events: eventsRows,
          urgent_tasks: urgentTasks,
          urgent_projects: urgentProjects,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // MANAGER — Vue équipe + projets gérés
    // ─────────────────────────────────────────────────────────────────────
    if (role === 'manager') {
      // Récupérer l'équipe du manager
      const [[managerRow]] = await pool.execute(
        'SELECT team_id FROM users WHERE id = ?',
        [userId]
      );
      const teamId = managerRow?.team_id;

      // Projets gérés par ce manager
      const [projRows] = await pool.execute(
        `SELECT id, statut FROM projects WHERE manager_id = ?`,
        [userId]
      );
      const projets = { total: projRows.length, en_cours: 0, termine: 0, en_attente: 0 };
      projRows.forEach(p => {
        if (projets[p.statut] !== undefined) projets[p.statut]++;
      });
      const managedProjectIds = projRows.map(p => p.id);

      // Membres de l'équipe du manager
      let teamMemberIds = [userId]; // inclut le manager lui-même
      if (teamId) {
        const [membersRows] = await pool.execute(
          'SELECT id FROM users WHERE team_id = ?',
          [teamId]
        );
        teamMemberIds = [...new Set([...teamMemberIds, ...membersRows.map(m => m.id)])];
      }
      const nb_membres = teamMemberIds.length;

      // Tâches de l'équipe (dans les projets gérés OU assignées aux membres de l'équipe)
      let taches = { total: 0, a_faire: 0, en_cours: 0, bloque: 0, termine: 0 };
      if (teamMemberIds.length > 0) {
        const placeholders = teamMemberIds.map(() => '?').join(',');
        let projPlaceholders = managedProjectIds.length > 0
          ? `OR t.project_id IN (${managedProjectIds.map(() => '?').join(',')})`
          : '';
        const [tachesRows] = await pool.execute(
          `SELECT statut, COUNT(*) AS cnt FROM tasks t
           WHERE (t.assignee_id IN (${placeholders}) ${projPlaceholders})
           GROUP BY statut`,
          managedProjectIds.length > 0
            ? [...teamMemberIds, ...managedProjectIds]
            : teamMemberIds
        );
        tachesRows.forEach(r => {
          taches[r.statut] = r.cnt;
          taches.total += r.cnt;
        });
      }

      // Tâches personnelles du manager
      const [myTachesRows] = await pool.execute(
        `SELECT statut, COUNT(*) AS cnt FROM tasks WHERE assignee_id = ? GROUP BY statut`,
        [userId]
      );
      const my_taches = { total: 0, a_faire: 0, en_cours: 0, bloque: 0, termine: 0 };
      myTachesRows.forEach(r => {
        my_taches[r.statut] = r.cnt;
        my_taches.total += r.cnt;
      });

      // Alertes urgentes de l'équipe
      const [urgentTasks] = teamMemberIds.length > 0
        ? await pool.execute(
            `SELECT t.id, t.titre, t.deadline, u.nom_prenom AS assignee_name
             FROM tasks t
             LEFT JOIN users u ON u.id = t.assignee_id
             WHERE t.statut != 'termine'
               AND t.deadline IS NOT NULL
               AND t.deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
               AND t.assignee_id IN (${teamMemberIds.map(() => '?').join(',')})`,
            teamMemberIds
          )
        : [[]];

      // Prochains événements de l'équipe
      const teamEventsQuery = teamId
        ? `SELECT id, title, start_time, target_type, target_team_id
           FROM planning_events
           WHERE start_time >= NOW()
             AND (target_type = 'all' OR target_team_id = ?)
           ORDER BY start_time ASC LIMIT 5`
        : `SELECT id, title, start_time, target_type, target_team_id
           FROM planning_events WHERE start_time >= NOW() AND target_type = 'all'
           ORDER BY start_time ASC LIMIT 5`;
      const [eventsRows] = teamId
        ? await pool.execute(teamEventsQuery, [teamId])
        : await pool.execute(teamEventsQuery);

      return res.json({
        success: true,
        role: 'manager',
        stats: {
          projets,
          nb_membres,
          taches,        // tâches de l'équipe
          my_taches,     // tâches personnelles du manager
          upcoming_events: eventsRows,
          urgent_tasks: urgentTasks,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // EMPLOYÉ — Vue personnelle
    // ─────────────────────────────────────────────────────────────────────
    const [tachesRows] = await pool.execute(
      `SELECT statut, COUNT(*) AS cnt FROM tasks WHERE assignee_id = ? GROUP BY statut`,
      [userId]
    );
    const taches = { total: 0, a_faire: 0, en_cours: 0, bloque: 0, termine: 0 };
    tachesRows.forEach(r => {
      taches[r.statut] = r.cnt;
      taches.total += r.cnt;
    });

    // Score de complétion
    const score = taches.total > 0
      ? Math.round((taches.termine / taches.total) * 100)
      : 100;

    // Tâches urgentes personnelles
    const [urgentTasks] = await pool.execute(
      `SELECT id, titre, deadline
       FROM tasks
       WHERE assignee_id = ?
         AND statut != 'termine'
         AND deadline IS NOT NULL
         AND deadline <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
       ORDER BY deadline ASC`,
      [userId]
    );

    // Récupérer l'équipe de l'employé pour les événements
    const [[empRow]] = await pool.execute(
      'SELECT team_id FROM users WHERE id = ?', [userId]
    );
    const empTeamId = empRow?.team_id;

    const eventsQuery = empTeamId
      ? `SELECT id, title, start_time FROM planning_events
         WHERE start_time >= NOW() AND (target_type = 'all' OR target_team_id = ?)
         ORDER BY start_time ASC LIMIT 5`
      : `SELECT id, title, start_time FROM planning_events
         WHERE start_time >= NOW() AND target_type = 'all'
         ORDER BY start_time ASC LIMIT 5`;
    const [eventsRows] = empTeamId
      ? await pool.execute(eventsQuery, [empTeamId])
      : await pool.execute(eventsQuery);

    return res.json({
      success: true,
      role: 'employe',
      stats: {
        taches,
        score,
        urgent_tasks: urgentTasks,
        upcoming_events: eventsRows,
      },
    });

  } catch (err) {
    console.error('[GET /api/dashboard/stats]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
