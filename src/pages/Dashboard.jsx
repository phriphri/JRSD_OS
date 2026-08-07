import React, { useEffect, useState, useCallback } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { api } from '../services/api';

const translations = {
  FR: { 
    greeting: 'Bonjour', org_view: 'Vue organisation', team_view: 'Vue équipe', pers_view: 'Tableau de bord personnel', refresh: 'Actualiser',
    kpi_prog_glob: 'Progression globale', kpi_agents: 'Agents inscrits', kpi_proj_crees: 'Projets créés', kpi_teams: 'Équipes',
    kpi_proj_en_cours: 'Projets en cours', kpi_taches_tot: 'Tâches totales', kpi_proj_term: 'Projets terminés', kpi_alertes: 'Alertes urgentes',
    avancement: 'Avancement des projets', aucune_alerte: 'Aucune urgence — beau travail !', mes_taches: 'Mes tâches personnelles', echeances_imm: 'Échéances immédiates',
    upcoming_programs: 'Prochains programmes au planning', all_org: 'Toute l\'organisation', your_team: 'Votre équipe',
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

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const getDaysLeft = (dateStr) => {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
};

// ─── Composants UI réutilisables ──────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-blue-500', delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 120 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden ring-1 ring-inset ring-slate-200/50 dark:ring-white/5 shadow-inner">
      <div
        className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
        style={{ width: `${width}%`, boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15)' }}
      />
    </div>
  );
}

function KPICard({ label, value, sub, icon, urgent = false, accent = false, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const borderCls = urgent
    ? 'border-red-500/30 dark:border-red-900/50 shadow-sm shadow-red-500/10'
    : accent
    ? 'border-indigo-500/30 dark:border-indigo-900/50 shadow-sm shadow-indigo-500/10'
    : 'border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm';

  const iconCls = urgent
    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/20'
    : accent
    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20'
    : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-200/50 dark:ring-white/10';

  const valueCls = urgent && Number(value) > 0
    ? 'text-red-600 dark:text-red-400 animate-pulse'
    : accent
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-slate-900 dark:text-white';

  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-[#0A0A0A] border rounded-2xl p-4 sm:p-5 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${borderCls} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent ${urgent ? 'to-red-500/10' : accent ? 'to-indigo-500/10' : 'to-blue-500/5'} blur-2xl -mr-10 -mt-10 rounded-full`} />
      <div className="relative z-10 flex justify-between items-start mb-3">
        <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">{label}</span>
        <div className={`p-1.5 sm:p-2 rounded-xl backdrop-blur-sm shrink-0 ${iconCls}`}>{icon}</div>
      </div>
      <p className={`relative z-10 text-2xl sm:text-4xl font-bold tracking-tight ${valueCls}`}>{value}</p>
      {sub && <p className="relative z-10 text-slate-500 dark:text-slate-500 text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium truncate">{sub}</p>}
    </div>
  );
}

function PlanningWidget({ events = [], t }) {
  const upcomingEvents = [...events]
    .filter(ev => new Date(ev.start_time) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5);

  const formatTime = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  if (upcomingEvents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm mt-8 hover:shadow-md transition-shadow">
      <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {t.upcoming_programs}
      </h3>
      <div className="space-y-3">
        {upcomingEvents.map(ev => (
          <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="shrink-0 text-center w-16">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 capitalize">{formatDate(ev.start_time)}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatTime(ev.start_time)}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ev.title}</p>
              {ev.target_type && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {ev.target_type === 'all' ? t.all_org : t.your_team}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ICÔNES SVG ──────────────────────────────────────────────────────────────

const IconChart = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconFolder = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const IconTeam = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconAlert = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);
const IconTask = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconPlayCircle = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

// ─── DASHBOARD ADMIN ──────────────────────────────────────────────────────────

function AdminDashboard({ stats, projects }) {
  const { projets, nb_agents, nb_equipes, taches, upcoming_events, urgent_tasks = [], urgent_projects = [] } = stats;
  const { language } = useGlobalStore();
  const t = translations[language === 'EN' ? 'EN' : 'FR'];

  const totalUrgent = urgent_tasks.length + urgent_projects.length;

  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard delay={0} label={t.kpi_prog_glob} value={`${avgProgress}%`}
          sub={`${projets.total} projet${projets.total !== 1 ? 's' : ''} ${t.total_proj}`} icon={<IconChart />} />
        <KPICard delay={80} label={t.kpi_agents} value={nb_agents}
          sub={t.active_accounts} icon={<IconUsers />} />
        <KPICard delay={160} label={t.kpi_proj_crees} value={projets.total}
          sub={`${projets.en_cours} ${t.in_progress_completed} ${projets.termine} ${t.completed}`} icon={<IconFolder />} />
        <KPICard delay={240} label={t.kpi_teams} value={nb_equipes}
          sub={t.reg_teams} icon={<IconTeam />} accent />
        <KPICard delay={320} label={t.kpi_proj_en_cours} value={projets.en_cours}
          sub={t.status_in_prog} icon={<IconPlayCircle />} />
        <KPICard delay={400} label={t.kpi_taches_tot} value={taches.total}
          sub={`${taches.en_cours} ${t.in_progress_completed} ${taches.termine} ${t.completed_f}`} icon={<IconTask />} />
        <KPICard delay={480} label={t.kpi_proj_term} value={projets.termine}
          sub={t.status_completed} icon={<IconFolder />} accent />
        <KPICard delay={560} urgent label={t.kpi_alertes} value={totalUrgent}
          sub={t.deadlines_3d} icon={<IconAlert />} />
      </div>

      {/* Avancement des projets */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h3 className="text-slate-900 dark:text-white font-semibold text-base sm:text-lg mb-4 sm:mb-6">{t.avancement}</h3>
        <div className="space-y-5">
          {projects.length === 0 ? (
            <p className="text-slate-500 text-sm">{t.no_proj_reg}</p>
          ) : (
            projects.map((proj, i) => (
              <div key={proj.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-900 dark:text-white text-sm font-medium truncate">{proj.name}</span>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      proj.statut === 'termine'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : proj.statut === 'en_cours'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      {proj.statut === 'termine' ? t.status_done : proj.statut === 'en_cours' ? t.status_prog : t.status_wait}
                    </span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-sm font-bold shrink-0 ml-2">{proj.progress || 0}%</span>
                </div>
                <ProgressBar value={proj.progress || 0} delay={i * 100}
                  color={proj.statut === 'termine' ? 'bg-emerald-500' : 'bg-blue-500'} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alertes urgentes */}
      {totalUrgent > 0 && (
        <div className="bg-white dark:bg-[#0A0A0A] border border-red-500/20 dark:border-red-900/30 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t.urgent_alerts_3d}
          </h3>
          <div className="space-y-2">
            {urgent_tasks.map(t => {
              const d = getDaysLeft(t.deadline);
              return (
                <div key={`t-${t.id}`} className="flex items-center justify-between gap-3 p-2.5 bg-red-950/10 border border-red-900/30 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{t.task}</span>
                    <span className="text-sm text-slate-900 dark:text-white truncate">{t.titre}</span>
                    {t.assignee_name && <span className="text-xs text-slate-400 shrink-0">→ {t.assignee_name}</span>}
                  </div>
                  <span className="text-red-400 text-xs font-bold shrink-0">
                    {d < 0 ? `${Math.abs(d)}${t.days} ${t.late}` : d === 0 ? t.today : `${d}${t.days}`}
                  </span>
                </div>
              );
            })}
            {urgent_projects.map(p => {
              const d = getDaysLeft(p.date_fin);
              return (
                <div key={`p-${p.id}`} className="flex items-center justify-between gap-3 p-2.5 bg-orange-950/10 border border-orange-900/30 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-orange-400 shrink-0 font-semibold">{t.project}</span>
                    <span className="text-sm text-slate-900 dark:text-white truncate">{p.nom}</span>
                  </div>
                  <span className="text-orange-400 text-xs font-bold shrink-0">
                    {d < 0 ? `${Math.abs(d)}${t.days} ${t.late}` : d === 0 ? t.today : `${d}${t.days}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PlanningWidget events={upcoming_events} t={t} />
    </div>
  );
}

// ─── DASHBOARD MANAGER ────────────────────────────────────────────────────────

function ManagerDashboard({ stats, projects }) {
  const { projets, nb_membres, taches, my_taches, upcoming_events, urgent_tasks = [] } = stats;
  const { language } = useGlobalStore();
  const t = translations[language === 'EN' ? 'EN' : 'FR'];

  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
    : 0;

  const myScore = my_taches.total > 0
    ? Math.round((my_taches.termine / my_taches.total) * 100)
    : 100;

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* KPI équipe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard delay={0} label={t.kpi_prog_glob} value={`${avgProgress}%`}
          sub={`${projets.total} projet${projets.total !== 1 ? 's' : ''} ${t.managed_proj}`} icon={<IconChart />} />
        <KPICard delay={80} label={t.kpi_agents} value={nb_membres}
          sub={t.active_team} icon={<IconUsers />} />
        <KPICard delay={160} label={t.kpi_taches_tot} value={taches.total}
          sub={`${taches.en_cours} ${t.in_progress_completed} ${taches.termine} ${t.completed_f}`} icon={<IconTask />} />
        <KPICard delay={240} urgent label={t.kpi_alertes} value={urgent_tasks.length}
          sub={t.deadlines_3d} icon={<IconAlert />} />
      </div>

      {/* Mes KPIs personnels */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">{t.mes_taches}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{myScore}%</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.completed_score}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{my_taches.a_faire}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.to_do}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{my_taches.en_cours}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.in_progress}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{my_taches.bloque}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.blocked}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{my_taches.termine}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.done}</p>
          </div>
        </div>
      </div>

      {/* Avancement des projets gérés */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h3 className="text-slate-900 dark:text-white font-semibold text-base sm:text-lg mb-4 sm:mb-6">{t.prog_your_proj}</h3>
        <div className="space-y-5">
          {projects.length === 0 ? (
            <p className="text-slate-500 text-sm">{t.no_proj_man}</p>
          ) : (
            projects.map((proj, i) => (
              <div key={proj.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-900 dark:text-white text-sm font-medium truncate">{proj.name}</span>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      proj.statut === 'termine'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : proj.statut === 'en_cours'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      {proj.statut === 'termine' ? t.status_done : proj.statut === 'en_cours' ? t.status_prog : t.status_wait}
                    </span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-sm font-bold shrink-0 ml-2">{proj.progress || 0}%</span>
                </div>
                <ProgressBar value={proj.progress || 0} delay={i * 100}
                  color={proj.statut === 'termine' ? 'bg-emerald-500' : 'bg-indigo-500'} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alertes urgentes équipe */}
      {urgent_tasks.length > 0 && (
        <div className="bg-white dark:bg-[#0A0A0A] border border-red-500/20 dark:border-red-900/30 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t.urgent_team}
          </h3>
          <div className="space-y-2">
            {urgent_tasks.map(t => {
              const d = getDaysLeft(t.deadline);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 bg-red-950/10 border border-red-900/30 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-white truncate">{t.titre}</span>
                    {t.assignee_name && <span className="text-xs text-slate-400 shrink-0">→ {t.assignee_name}</span>}
                  </div>
                  <span className="text-red-400 text-xs font-bold shrink-0">
                    {d < 0 ? `${Math.abs(d)}${t.days} ${t.late}` : d === 0 ? t.today : `${d}${t.days}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PlanningWidget events={upcoming_events} t={t} />
    </div>
  );
}

// ─── DASHBOARD USER ───────────────────────────────────────────────────────────

function UserDashboard({ stats }) {
  const { taches, score, urgent_tasks = [], upcoming_events } = stats;
  const { language } = useGlobalStore();
  const t = translations[language === 'EN' ? 'EN' : 'FR'];
  
  const myScore = score ?? (taches.total > 0 ? Math.round((taches.termine / taches.total) * 100) : 100);

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Score circulaire */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="url(#emerald-gradient)"
                strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * myScore) / 100}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <defs>
                <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">{myScore}%</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mt-0.5 sm:mt-1">{t.completed_score}</span>
            </div>
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base mt-3 sm:mt-4 text-center">
            {myScore === 100 ? t.perfect : myScore >= 60 ? t.good_pace : t.some_delays}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs text-center mt-0.5 sm:mt-1">
            {taches.termine} / {taches.total} tâche{taches.total !== 1 ? 's' : ''} terminée{taches.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Détails tâches */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-3 sm:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{taches.a_faire}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium">{t.to_do}</p>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-3 sm:p-5 text-center shadow-sm shadow-amber-500/5 hover:shadow-md transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-500 dark:text-amber-400">{taches.en_cours}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium">{t.in_progress}</p>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-3 sm:p-5 text-center shadow-sm shadow-emerald-500/5 hover:shadow-md transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-500 dark:text-emerald-400">{taches.termine}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium">{t.done}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">{t.echeances_imm}</h3>
            {urgent_tasks.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-500 text-sm text-center py-4">{t.aucune_alerte}</p>
            ) : (
              <div className="space-y-2">
                {urgent_tasks.map(t => {
                  const d = getDaysLeft(t.deadline);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 bg-red-950/10 border border-red-900/30 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="text-slate-900 dark:text-white text-sm truncate">{t.titre}</span>
                      </div>
                      <span className="text-red-400 text-xs font-bold shrink-0">
                        {d < 0 ? `${Math.abs(d)}${t.days} ${t.late}` : d === 0 ? t.today : `${d}${t.days}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <PlanningWidget events={upcoming_events} t={t} />
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

function DashboardSection() {
  const { currentUser, projects, language } = useGlobalStore();
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = currentUser?.role?.toLowerCase() || 'employe';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.getStats();
      if (res.success) setDashStats(res.stats);
    } catch (err) {
      console.error('[Dashboard] Erreur chargement stats:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) loadStats();
  }, [currentUser, loadStats]);

  const t = translations[language === 'EN' ? 'EN' : 'FR'];

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">{t.loading_space || 'Chargement...'}</div>;
  }

  // Filtrage des projets côté client pour l'affichage des barres de progression
  const filteredProjects = isAdmin
    ? projects || []
    : isManager
    ? (projects || []).filter(p => p.managerId === currentUser?.id)
    : [];

  const firstName = currentUser?.name?.split(' ')[0] || currentUser?.name || '';

  return (
    <section id="dashboard" className="scroll-mt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-4">
        <div>
          <p className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 tracking-wide uppercase">
            {isAdmin ? t.org_view : isManager ? t.team_view : t.pers_view}
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.875rem)' }}>
            {t.greeting}, {firstName} 👋
          </h2>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.refresh}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 sm:h-36 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
          ))}
        </div>
      ) : dashStats ? (
        isAdmin ? (
          <AdminDashboard stats={dashStats} projects={filteredProjects} />
        ) : isManager ? (
          <ManagerDashboard stats={dashStats} projects={filteredProjects} />
        ) : (
          <UserDashboard stats={dashStats} />
        )
      ) : (
        <p className="text-slate-500 text-sm text-center py-12">{t.err_stats}</p>
      )}
    </section>
  );
}

export default function Dashboard() {
  return <DashboardSection />;
}
