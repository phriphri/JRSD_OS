const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Replace translations object
content = content.replace(/const translations = \{[\s\S]*?\n\};\n/m, `const translations = {
  FR: { 
    greeting: 'Bonjour', org_view: 'Vue organisation', team_view: 'Vue équipe', pers_view: 'Tableau de bord personnel', refresh: 'Actualiser',
    kpi_prog_glob: 'Progression globale', kpi_agents: 'Agents inscrits', kpi_proj_crees: 'Projets créés', kpi_teams: 'Équipes',
    kpi_proj_en_cours: 'Projets en cours', kpi_taches_tot: 'Tâches totales', kpi_proj_term: 'Projets terminés', kpi_alertes: 'Alertes urgentes',
    avancement: 'Avancement des projets', aucune_alerte: 'Aucune urgence — beau travail !', mes_taches: 'Mes tâches personnelles', echeances_imm: 'Échéances immédiates',
    upcoming_programs: 'Prochains programmes au planning', all_org: 'Toute l\\'organisation', your_team: 'Votre équipe',
    total_proj: 'au total', active_accounts: 'Comptes actifs', in_progress_completed: 'en cours ·', completed: 'terminés', completed_f: 'terminées',
    reg_teams: 'Équipes enregistrées', status_in_prog: 'Statut « en_cours »', status_completed: 'Statut « terminé »',
    deadlines_3d: 'Échéances ≤ 3 jours', no_proj_reg: 'Aucun projet enregistré.',
    status_done: 'Terminé', status_prog: 'En cours', status_wait: 'En attente',
    urgent_alerts_3d: 'Alertes urgentes — Échéances ≤ 3 jours', task: 'Tâche', project: 'Projet',
    late: 'retard', today: 'Auj.', days: 'j', managed_proj: 'gérés', active_team: 'Actifs dans votre équipe',
    completed_score: 'Complété', to_do: 'À faire', in_progress: 'En cours', blocked: 'Bloqué', done: 'Terminées',
    prog_your_proj: 'Avancement de vos projets', no_proj_man: 'Aucun projet géré.', urgent_team: 'Échéances urgentes — Équipe',
    perfect: '🎉 Parfait !', good_pace: '👍 Bon rythme', some_delays: '⚡ Quelques retards',
    tasks_done: 'tâche terminée', tasks_done_plur: 'tâches terminées', loading_space: 'Chargement de votre espace...',
    err_stats: 'Impossible de charger les statistiques.'
  },
  EN: { 
    greeting: 'Hello', org_view: 'Organization view', team_view: 'Team view', pers_view: 'Personal dashboard', refresh: 'Refresh',
    kpi_prog_glob: 'Overall Progress', kpi_agents: 'Registered Agents', kpi_proj_crees: 'Created Projects', kpi_teams: 'Teams',
    kpi_proj_en_cours: 'Active Projects', kpi_taches_tot: 'Total Tasks', kpi_proj_term: 'Completed Projects', kpi_alertes: 'Urgent Alerts',
    avancement: 'Project Progress', aucune_alerte: 'No urgent alerts — great job!', mes_taches: 'My Personal Tasks', echeances_imm: 'Immediate Deadlines',
    upcoming_programs: 'Upcoming planning programs', all_org: 'All organization', your_team: 'Your team',
    total_proj: 'in total', active_accounts: 'Active accounts', in_progress_completed: 'in progress ·', completed: 'completed', completed_f: 'completed',
    reg_teams: 'Registered teams', status_in_prog: 'Status « in progress »', status_completed: 'Status « completed »',
    deadlines_3d: 'Deadlines ≤ 3 days', no_proj_reg: 'No projects registered.',
    status_done: 'Done', status_prog: 'In progress', status_wait: 'Waiting',
    urgent_alerts_3d: 'Urgent alerts — Deadlines ≤ 3 days', task: 'Task', project: 'Project',
    late: 'late', today: 'Today', days: 'd', managed_proj: 'managed', active_team: 'Active in your team',
    completed_score: 'Completed', to_do: 'To do', in_progress: 'In progress', blocked: 'Blocked', done: 'Done',
    prog_your_proj: 'Your projects progress', no_proj_man: 'No projects managed.', urgent_team: 'Urgent deadlines — Team',
    perfect: '🎉 Perfect!', good_pace: '👍 Good pace', some_delays: '⚡ Some delays',
    tasks_done: 'task completed', tasks_done_plur: 'tasks completed', loading_space: 'Loading your space...',
    err_stats: 'Unable to load statistics.'
  }
};
`);

// PlanningWidget
content = content.replace(/function PlanningWidget\(\{ events = \[\] \}\) \{/, 'function PlanningWidget({ events = [], t }) {');
content = content.replace(/<PlanningWidget events=\{upcoming_events\} \/>/g, '<PlanningWidget events={upcoming_events} t={t} />');
content = content.replace('Prochains programmes au planning', '{t.upcoming_programs}');
content = content.replace(/ev\.target_type === 'all' \? "Toute l'organisation" : 'Votre équipe'/g, "ev.target_type === 'all' ? t.all_org : t.your_team");

// AdminDashboard
content = content.replace(/sub=\{`\$\{projets\.total\} projet\$\{projets\.total !== 1 \? 's' : ''\} au total`\}/, "sub={`\${projets.total} projet\${projets.total !== 1 ? 's' : ''} \${t.total_proj}`}");
content = content.replace(/sub="Comptes actifs"/, "sub={t.active_accounts}");
content = content.replace(/sub=\{`\$\{projets\.en_cours\} en cours · \$\{projets\.termine\} terminés`\}/, "sub={`\${projets.en_cours} \${t.in_progress_completed} \${projets.termine} \${t.completed}`}");
content = content.replace(/sub="Équipes enregistrées"/, "sub={t.reg_teams}");
content = content.replace(/sub="Statut « en_cours »"/, "sub={t.status_in_prog}");
content = content.replace(/sub=\{`\$\{taches\.en_cours\} en cours · \$\{taches\.termine\} terminées`\}/, "sub={`\${taches.en_cours} \${t.in_progress_completed} \${taches.termine} \${t.completed_f}`}");
content = content.replace(/sub="Statut « terminé »"/, "sub={t.status_completed}");
content = content.replace(/sub="Échéances ≤ 3 jours"/g, "sub={t.deadlines_3d}");

content = content.replace(/Aucun projet enregistré\./, "{t.no_proj_reg}");
content = content.replace(/proj\.statut === 'termine' \? 'Terminé' : proj\.statut === 'en_cours' \? 'En cours' : 'En attente'/g, "proj.statut === 'termine' ? t.status_done : proj.statut === 'en_cours' ? t.status_prog : t.status_wait");

content = content.replace(/Alertes urgentes — Échéances ≤ 3 jours/, "{t.urgent_alerts_3d}");
content = content.replace(/>Tâche</g, ">{t.task}<");
content = content.replace(/>Projet</g, ">{t.project}<");
content = content.replace(/d < 0 \? `\$\{Math\.abs\(d\)\}j retard` : d === 0 \? 'Auj\.' : `\$\{d\}j`/g, "d < 0 ? `\${Math.abs(d)}\${t.days} \${t.late}` : d === 0 ? t.today : `\${d}\${t.days}`");
content = content.replace(/d < 0 \? `\$\{Math\.abs\(d\)\}j de retard` : d === 0 \? 'Auj\.' : `\$\{d\}j`/g, "d < 0 ? `\${Math.abs(d)}\${t.days} \${t.late}` : d === 0 ? t.today : `\${d}\${t.days}`");

// ManagerDashboard
content = content.replace(/sub=\{`\$\{projets\.total\} projet\$\{projets\.total !== 1 \? 's' : ''\} gérés`\}/, "sub={`\${projets.total} projet\${projets.total !== 1 ? 's' : ''} \${t.managed_proj}`}");
content = content.replace(/sub="Actifs dans votre équipe"/, 'sub={t.active_team}');
content = content.replace(/>Complété</g, '>{t.completed_score}<');
content = content.replace(/>À faire</g, '>{t.to_do}<');
content = content.replace(/>En cours</g, '>{t.in_progress}<');
content = content.replace(/>Bloqué</g, '>{t.blocked}<');
content = content.replace(/>Terminées</g, '>{t.done}<');

content = content.replace(/Avancement de vos projets/, '{t.prog_your_proj}');
content = content.replace(/Aucun projet géré\./, '{t.no_proj_man}');

content = content.replace(/Échéances urgentes — Équipe/, '{t.urgent_team}');

// UserDashboard
content = content.replace(/myScore === 100 \? '🎉 Parfait !' : myScore >= 60 \? '👍 Bon rythme' : '⚡ Quelques retards'/g, "myScore === 100 ? t.perfect : myScore >= 60 ? t.good_pace : t.some_delays");
content = content.replace(/taches\.total !== 1 \? 's' : ''\} terminée\$\{taches\.total !== 1 \? 's' : ''\}/, "taches.total !== 1 ? 's' : ''} ${taches.total !== 1 ? t.tasks_done_plur : t.tasks_done}");

content = content.replace(/Chargement de votre espace\.\.\./, '{t.loading_space}');
content = content.replace(/Impossible de charger les statistiques\./, '{t.err_stats}');

fs.writeFileSync('src/pages/Dashboard.jsx', content);
console.log('Dashboard translations complete');
